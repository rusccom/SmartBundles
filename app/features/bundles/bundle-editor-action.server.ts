import { data } from "react-router";
import { authenticate } from "../../shopify.server";
import type { AdminClient } from "../shopify/admin-api.server";
import {
  createBundle,
  getBundleForAction,
  getBundleForActionByDomain,
  getBundleShopId,
  saveBundleConfiguration,
} from "./bundle-repository.server";
import type { BundleEditorActionData } from "./bundle-editor-action.types";
import type {
  BundleContentSubmission,
  BundleEditorSubmission,
} from "./bundle.types";
import { parseBundleForm } from "./bundle-validation.server";
import { BundleComponentValidationError } from "./bundle-component-validation-error";
import { activateBundle, draftBundle, saveDraftPrice, syncActiveBundle } from "./bundle-projection.server";
import { FREE_ACTIVE_BUNDLE_LIMIT, getBundleQuota } from "./bundle-quota.server";
import { QuotaExceededError } from "./quota-exceeded-error";
import { BundleContentError } from "./content/BundleContentError.server";
import { createSubmittedParent } from "./content/content-creation.server";
import { validateContentPatch } from "./content/content-validation.server";
import { updateProductContent } from "./content/shopify-product-content.server";

interface ActionContext {
  admin: AdminClient;
  shopId: string;
  shopDomain: string;
  bundleId: string | null;
}

export async function bundleEditorAction(request: Request, bundleId: string | null) {
  const { admin, session } = await authenticate.admin(request);
  const parsed = parseBundleForm(await request.formData(), bundleId === null);
  if (!parsed.data || Object.keys(parsed.errors).length) return rejected(400, parsed.errors);
  try {
    if (bundleId) {
      const bundle = await getBundleForActionByDomain(session.shop, bundleId);
      const context = { admin, shopId: bundle.shopId, shopDomain: session.shop, bundleId };
      return await saveExisting(context, parsed.data, bundle);
    }
    const shopId = await getBundleShopId(session.shop);
    return await saveNew({ admin, shopId, shopDomain: session.shop, bundleId }, parsed.data);
  } catch (error) {
    return knownError(error);
  }
}

async function saveExisting(
  context: ActionContext,
  submission: BundleEditorSubmission,
  bundle: Awaited<ReturnType<typeof getBundleForActionByDomain>>,
) {
  await assertActivationRequest(context.shopId, bundle.status, submission.desiredStatus);
  await saveContent(context.admin, bundle, submission);
  await saveBundleState(context, bundle.status, submission);
  if (submission.storedConfigurationDirty) {
    await saveBundleConfiguration(context.shopId, bundle.id, submission.draft);
  }
  const message = submission.desiredStatus === "ACTIVE" ? "Bundle saved and active." : "Bundle saved as draft.";
  return accepted(bundle.id, submission.desiredStatus, message);
}

async function saveContent(
  admin: AdminClient,
  bundle: Awaited<ReturnType<typeof getBundleForAction>>,
  submission: BundleEditorSubmission,
): Promise<void> {
  if (!Object.keys(submission.content).length) return;
  const errors = validateContentPatch(submission.content);
  if (Object.keys(errors).length) throw new BundleContentError("Fix the product content.", 422, errors);
  await updateProductContent(admin, {
    productId: bundle.parentProductGid,
    content: submission.content,
  });
}

async function saveBundleState(
  context: ActionContext,
  currentStatus: "DRAFT" | "ACTIVE",
  submission: BundleEditorSubmission,
): Promise<void> {
  if (submission.desiredStatus === "ACTIVE") {
    return saveActiveState(context, currentStatus, submission);
  }
  if (currentStatus === "ACTIVE") {
    const draft = submission.configurationDirty ? submission.draft : undefined;
    return draftBundle(context.admin, context.shopId, context.bundleId!, draft);
  }
  if (submission.configurationDirty) {
    await saveDraftPrice(context.admin, context.shopId, context.bundleId!, submission.draft);
  }
}

async function saveActiveState(
  context: ActionContext,
  currentStatus: "DRAFT" | "ACTIVE",
  submission: BundleEditorSubmission,
): Promise<void> {
  if (currentStatus === "DRAFT") {
    const draft = submission.configurationDirty ? submission.draft : undefined;
    return activateBundle(context.admin, context.shopId, context.bundleId!, draft);
  }
  if (submission.configurationDirty) {
    await syncActiveBundle(context.admin, context.shopId, context.bundleId!, submission.draft);
  }
}

async function saveNew(context: ActionContext, submission: BundleEditorSubmission) {
  if (submission.desiredStatus === "ACTIVE") {
    await assertActivationCapacity(context.shopId);
  }
  const created = await createSubmittedParent(
    context.admin, context.shopDomain, submission.creationToken, creationContent(submission),
  );
  const bundle = await createBundle(context.shopId, created.publicId, created.parent, submission.draft);
  if (submission.desiredStatus === "ACTIVE") {
    await activateBundle(context.admin, context.shopId, bundle.id, submission.draft);
  } else if (bundle.status === "ACTIVE") {
    await draftBundle(context.admin, context.shopId, bundle.id, submission.draft);
  } else {
    await saveDraftPrice(context.admin, context.shopId, bundle.id, submission.draft);
  }
  return accepted(bundle.id, submission.desiredStatus, "Bundle created.");
}

function creationContent(submission: BundleEditorSubmission): BundleContentSubmission {
  const { title, descriptionHtml } = submission.content;
  if (title === undefined || descriptionHtml === undefined) {
    throw new BundleContentError("Bundle title and description are required.", 400);
  }
  return { title, descriptionHtml };
}

function assertActivationRequest(
  shopId: string,
  currentStatus: "DRAFT" | "ACTIVE",
  desiredStatus: "DRAFT" | "ACTIVE",
): Promise<void> {
  return currentStatus === "DRAFT" && desiredStatus === "ACTIVE"
    ? assertActivationCapacity(shopId)
    : Promise.resolve();
}

async function assertActivationCapacity(shopId: string): Promise<void> {
  const quota = await getBundleQuota(shopId);
  if (quota.canActivate) return;
  throw new QuotaExceededError(quota.used, quota.limit ?? FREE_ACTIVE_BUNDLE_LIMIT);
}

function knownError(error: unknown) {
  if (error instanceof BundleContentError) {
    return rejected(error.status, error.errors, error.message);
  }
  if (error instanceof QuotaExceededError) {
    return rejected(409, {}, "The Free plan allows 3 active bundles.", "quota");
  }
  if (error instanceof BundleComponentValidationError) {
    return rejected(422, {}, error.message, "component");
  }
  throw error;
}

function accepted(bundleId: string, status: "DRAFT" | "ACTIVE", message: string) {
  return data<BundleEditorActionData>({
    source: "bundle-editor", outcome: "accepted", bundleId, status, message,
  });
}

function rejected(
  status: number,
  errors: Record<string, string>,
  message?: string,
  issue?: "quota" | "component",
) {
  return data<BundleEditorActionData>({
    source: "bundle-editor", outcome: "rejected", errors, message, issue,
  }, { status });
}
