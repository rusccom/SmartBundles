import { data, redirect } from "react-router";
import { authenticate } from "../../shopify.server";
import { ensureShopContext } from "../installation/shop-context.server";
import { bundleWritesDisabled } from "../operations/bundle-write-gate.server";
import type { AdminClient } from "../shopify/admin-api.server";
import { BundleContentError } from "./content/BundleContentError.server";
import { createSubmittedParent } from "./content/content-creation.server";
import { syncSubmittedContent } from "./content/content-sync.server";
import { activateBundle } from "./bundle-activation.server";
import { BundleComponentValidationError } from "./bundle-component-validation-error";
import {
  createBundleDraft,
  saveBundleDraft,
} from "./bundle-draft-repository.server";
import { BundleVersionConflictError } from "./BundleVersionConflictError.server";
import { pauseBundle } from "./bundle-pause.server";
import { QuotaExceededError } from "./bundle-quota.server";
import { recoverBundleSaveClaim } from "./bundle-save-recovery.server";
import {
  assertBundleSaveClaim,
  claimBundleSave,
  markBundleSaveApplying,
  releaseBundleSaveClaim,
  type BundleSaveClaim,
} from "./bundle-save-claim.server";
import type { BundleEditorSubmission } from "./bundle.types";
import { parseBundleForm } from "./bundle-validation.server";

export interface EditorActionError {
  errors: Record<string, string>;
  message?: string;
}

interface ActionContext {
  admin: AdminClient;
  shopId: string;
  shopDomain: string;
  bundleId: string | null;
  form: FormData;
}

interface ExistingSaveAttempt {
  productSaved: boolean;
  remoteStarted: boolean;
  claim?: BundleSaveClaim;
}

export async function bundleEditorAction(request: Request, bundleId: string | null) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  if (bundleWritesDisabled()) return maintenanceFailure();
  const form = await request.formData();
  if (form.get("intent") === "pause") return pauseEditorBundle(admin, shop.id, bundleId);
  const parsed = parseBundleForm(form);
  if (Object.keys(parsed.errors).length || !parsed.data) return failure(400, undefined, parsed.errors);
  const context = { admin, shopId: shop.id, shopDomain: session.shop, bundleId, form };
  return saveEditorSubmission(context, parsed.data);
}

async function saveEditorSubmission(context: ActionContext, submission: BundleEditorSubmission) {
  if (context.bundleId) return saveExistingSubmission(context, submission);
  return saveNewSubmission(context, submission);
}

async function saveExistingSubmission(context: ActionContext, submission: BundleEditorSubmission) {
  if (submission.bundleVersion === null) return invalidVersion();
  const attempt: ExistingSaveAttempt = { productSaved: false, remoteStarted: false };
  try {
    const recovery = await recoverBundleSaveClaim(context.admin, context.shopId, context.bundleId!);
    if (recovery === "WAITING" || recovery === "RECOVERED") return recoveryConflict(recovery);
    return await saveClaimedSubmission(context, submission, attempt);
  } catch (error) {
    if (attempt.claim && !attempt.remoteStarted) await releaseFailedClaim(attempt.claim);
    return knownSaveError(error, attempt.productSaved);
  }
}

async function saveClaimedSubmission(
  context: ActionContext,
  submission: BundleEditorSubmission,
  attempt: ExistingSaveAttempt,
) {
  const claim = await claimBundleSave(context.shopId, context.bundleId!, submission.bundleVersion!);
  attempt.claim = claim;
  attempt.productSaved = await syncSubmittedContent(context.admin, {
    identity: contentIdentity(context, claim), submission: submission.content,
    assertBundleVersion: () => assertBundleSaveClaim(claim),
    beforeMutation: () => beginRemoteMutation(claim, attempt),
  });
  const saved = await saveBundleDraft(claim, submission.draft);
  attempt.claim = undefined;
  return finishEditorAction(context, saved.id, false);
}

async function beginRemoteMutation(claim: BundleSaveClaim, attempt: ExistingSaveAttempt) {
  await markBundleSaveApplying(claim);
  attempt.remoteStarted = true;
}

async function saveNewSubmission(context: ActionContext, submission: BundleEditorSubmission) {
  if (submission.bundleVersion !== null) return invalidVersion();
  try {
    const created = await createSubmittedParent(
      context.admin, context.shopDomain, submission.creationToken, submission.content,
    );
    const saved = await createBundleDraft(context.shopId, created.publicId, created.parent, submission.draft);
    return finishEditorAction(context, saved.id, true);
  } catch (error) {
    return knownSaveError(error, true);
  }
}

function contentIdentity(
  context: ActionContext,
  claim: BundleSaveClaim,
) {
  return {
    shopDomain: context.shopDomain,
    bundleId: claim.id,
    productId: claim.productId,
    publicId: claim.publicId,
    lockVersion: claim.lockVersion,
  };
}

async function releaseFailedClaim(claim: BundleSaveClaim): Promise<void> {
  try {
    await releaseBundleSaveClaim(claim);
  } catch (error) {
    console.error("[bundle-editor] Failed to release a save claim.", error);
  }
}

function knownSaveError(error: unknown, productSaved: boolean) {
  if (error instanceof BundleContentError) {
    return failure(error.status, error.message, error.errors);
  }
  if (error instanceof BundleVersionConflictError) return versionConflict(productSaved);
  throw error;
}

function invalidVersion() {
  return failure(400, "The bundle version is invalid. Reload and try again.", {});
}

function maintenanceFailure() {
  return failure(503, "Bundle changes are temporarily unavailable during maintenance.", {});
}

function versionConflict(productSaved: boolean) {
  const message = productSaved
    ? "Shopify content was saved, but this bundle draft changed in another tab. Reload before saving the bundle settings again."
    : "This bundle changed in another tab. Reload before saving.";
  return failure(409, message, {});
}

function recoveryConflict(recovery: "WAITING" | "RECOVERED") {
  const message = recovery === "WAITING"
    ? "A previous Shopify save is still being verified. Reload this page later."
    : "An interrupted Shopify save was recovered. Reload and review the current Shopify content.";
  return failure(409, message, {});
}

function failure(status: number, message: string | undefined, errors: Record<string, string>) {
  return data<EditorActionError>({ errors, message }, { status });
}

async function pauseEditorBundle(
  admin: Parameters<typeof pauseBundle>[0],
  shopId: string,
  bundleId: string | null,
): Promise<Response> {
  if (!bundleId) throw new Response("Bundle not found", { status: 404 });
  try {
    const recovery = await recoverBundleSaveClaim(admin, shopId, bundleId);
    if (recovery === "WAITING") return redirect(editorUrl(bundleId, "save=pending"));
    await pauseBundle(admin, shopId, bundleId);
    return redirect(editorUrl(bundleId, "paused=1"));
  } catch {
    return redirect(editorUrl(bundleId, "sync=failed"));
  }
}

async function finishEditorAction(context: ActionContext, bundleId: string, created: boolean) {
  if (context.form.get("intent") !== "activate") return redirect(editorUrl(bundleId, "saved=1"));
  const replacement = stringValue(context.form.get("replacementId"));
  try {
    await activateBundle(context.admin, context.shopId, bundleId, replacement);
    return redirect(editorUrl(bundleId, "published=1"));
  } catch (error) {
    if (error instanceof QuotaExceededError) return redirect(editorUrl(bundleId, "quota=limit"));
    if (error instanceof BundleComponentValidationError) return componentFailure(bundleId, created, error);
    return redirect(editorUrl(bundleId, "sync=failed"));
  }
}

function componentFailure(bundleId: string, created: boolean, error: BundleComponentValidationError) {
  if (created) return redirect(editorUrl(bundleId, componentQuery(error)));
  return failure(400, undefined, { selectors: error.message });
}

function componentQuery(error: BundleComponentValidationError): string {
  return error.code === "SOLD_OUT" ? "component=sold-out" : "component=invalid";
}

function editorUrl(bundleId: string, query: string): string {
  return `/app/bundles/${bundleId}?${query}`;
}

function stringValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
