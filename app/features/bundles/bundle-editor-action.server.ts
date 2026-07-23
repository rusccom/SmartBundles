import { data } from "react-router";
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
import { pauseSavedBundle, type SavedBundlePauseInput } from "./bundle-pause.server";
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
import type {
  BundleEditorActionData,
  BundleEditorReceipt,
  BundleEditorReceiptKind,
} from "./bundle-editor-action.types";
import { parseBundleForm } from "./bundle-validation.server";

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
    return knownSaveError(error, attempt.productSaved || attempt.remoteStarted);
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
  const activating = submission.desiredStatus === "ACTIVE";
  const pausing = submission.desiredStatus === "DRAFT" && canPause(claim.status);
  const saved = await saveBundleDraft(claim, submission.draft, activating || pausing);
  attempt.claim = undefined;
  return finishEditorAction(context, saved.id, existingFinish(activating, pausing, claim, saved));
}

function existingFinish(
  activating: boolean,
  pausing: boolean,
  claim: BundleSaveClaim,
  saved: Awaited<ReturnType<typeof saveBundleDraft>>,
): EditorFinish {
  return {
    activating,
    editorRevision: savedRevision(saved),
    pause: pausing ? savedPauseInput(claim, saved) : undefined,
    saveClaim: activating ? claim : undefined,
  };
}

function savedPauseInput(
  claim: BundleSaveClaim,
  saved: Awaited<ReturnType<typeof saveBundleDraft>>,
): Omit<SavedBundlePauseInput, "shopId" | "bundleId"> {
  const revision = saved.activeRevision ?? saved.draftRevision;
  if (revision === null) throw new Error("Bundle has no revision to pause.");
  return {
    revision, lockVersion: saved.lockVersion,
    status: claim.status, saveToken: claim.token,
  };
}

async function beginRemoteMutation(claim: BundleSaveClaim, attempt: ExistingSaveAttempt) {
  await markBundleSaveApplying(claim);
  attempt.remoteStarted = true;
}

async function saveNewSubmission(context: ActionContext, submission: BundleEditorSubmission) {
  if (submission.bundleVersion !== null) return invalidVersion();
  let productSaved = false;
  try {
    const created = await createSubmittedParent(
      context.admin, context.shopDomain, submission.creationToken, submission.content,
    );
    productSaved = true;
    const saved = await createBundleDraft(context.shopId, created.publicId, created.parent, submission.draft);
    return finishEditorAction(context, saved.id, {
      activating: submission.desiredStatus === "ACTIVE",
      editorRevision: savedRevision(saved),
    });
  } catch (error) {
    return knownSaveError(error, productSaved);
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
    if (productSaved || error.productSaved || error.status === 502) {
      return uncertain(error.status, error.message, error.errors);
    }
    return failure(error.status, error.message, error.errors);
  }
  if (error instanceof BundleVersionConflictError) return versionConflict(productSaved);
  if (productSaved) {
    console.error("[bundle-editor] Local save failed after Shopify changed.", error);
    return uncertain(500,
      "Shopify content may have been saved, but the bundle state could not be confirmed. Reload before continuing.",
      {});
  }
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
  return productSaved ? uncertain(409, message, {}) : failure(409, message, {});
}

function recoveryConflict(recovery: "WAITING" | "RECOVERED") {
  const message = recovery === "WAITING"
    ? "A previous Shopify save is still being verified. Reload this page later."
    : "An interrupted Shopify save was recovered. Reload and review the current Shopify content.";
  return failure(409, message, {});
}

function failure(status: number, message: string | undefined, errors: Record<string, string>) {
  return data<BundleEditorActionData>({ outcome: "rejected", errors, message }, { status });
}

function uncertain(status: number, message: string, errors: Record<string, string>) {
  return data<BundleEditorActionData>({ outcome: "uncertain", errors, message }, { status });
}

async function finishEditorAction(
  context: ActionContext,
  bundleId: string,
  finish: EditorFinish,
) {
  if (finish.pause) return finishSavedPause(context, bundleId, finish);
  if (!finish.activating) return accepted(bundleId, finish, "saved", "Bundle saved.");
  const replacement = stringValue(context.form.get("replacementId"));
  try {
    await activateBundle(context.admin, context.shopId, bundleId, replacement, finish.saveClaim?.token);
    return accepted(bundleId, finish, "published", "Bundle saved and published.");
  } catch (error) {
    if (finish.saveClaim) await releaseFailedClaim(finish.saveClaim);
    return activationFailure(bundleId, finish, error);
  }
}

interface EditorFinish {
  activating: boolean;
  editorRevision: number;
  pause?: Omit<SavedBundlePauseInput, "shopId" | "bundleId">;
  saveClaim?: BundleSaveClaim;
}

async function finishSavedPause(
  context: ActionContext,
  bundleId: string,
  finish: EditorFinish,
) {
  const pause = finish.pause!;
  try {
    await pauseSavedBundle(context.admin, { ...pause, shopId: context.shopId, bundleId });
    return accepted(bundleId, finish, "paused", "Bundle saved and paused.");
  } catch {
    return accepted(bundleId, finish, "sync",
      "Bundle draft saved, but Shopify publication needs retry.");
  }
}

function canPause(status: string): boolean {
  return status === "ACTIVE" || status === "NEEDS_ATTENTION";
}

function componentMessage(error: BundleComponentValidationError): string {
  const issue = error.code === "SOLD_OUT"
    ? "Each component needs an available variant."
    : "A component is no longer valid or published to Online Store.";
  return `Bundle draft saved. ${issue}`;
}

function activationFailure(bundleId: string, finish: EditorFinish, error: unknown) {
  if (error instanceof QuotaExceededError) {
    return accepted(bundleId, finish, "quota", "Bundle draft saved. Choose an active bundle to replace.");
  }
  if (error instanceof BundleComponentValidationError) {
    return accepted(bundleId, finish, "component", componentMessage(error));
  }
  return accepted(bundleId, finish, "sync", "Bundle draft saved, but Shopify publication needs retry.");
}

function accepted(
  bundleId: string,
  finish: Pick<EditorFinish, "editorRevision">,
  kind: BundleEditorReceiptKind,
  message: string,
) {
  const receipt: BundleEditorReceipt = {
    bundleId, editorRevision: finish.editorRevision, kind, message,
  };
  return data<BundleEditorActionData>({ outcome: "accepted", receipt });
}

function savedRevision(saved: { draftRevision: number | null; activeRevision: number | null }): number {
  const revision = saved.draftRevision ?? saved.activeRevision;
  if (revision === null) throw new Error("Bundle has no editor revision.");
  return revision;
}

function stringValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
