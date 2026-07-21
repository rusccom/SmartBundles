import type { AdminClient } from "../../shopify/admin-api.server";
import { BundleContentError } from "./BundleContentError.server";
import { contentFieldHash } from "./content-hash.server";
import { signContentVersion, verifyContentVersion } from "./content-token.server";
import type {
  ContentSyncInput,
  ContentTokenSource,
  ContentVersionPayload,
  ProductContentPatch,
  ShopifyProductContent,
} from "./content.types";
import { validateContentPatch } from "./content-validation.server";
import { readProductContent, updateProductContent } from "./shopify-product-content.server";
import { descriptionsSemanticallyEqual } from "../../rich-text/description/description-sanitize.server";

export function editorContentData(source: ContentTokenSource) {
  return {
    title: source.content.title,
    descriptionHtml: source.content.descriptionHtml,
    contentVersionToken: signContentVersion(source),
  };
}

export async function syncSubmittedContent(
  admin: AdminClient,
  input: ContentSyncInput,
): Promise<boolean> {
  const token = verifyContentVersion(input.submission.contentVersionToken);
  assertTokenIdentity(token, input);
  const patch = submittedPatch(token, input);
  assertValidPatch(patch);
  if (!hasPatch(patch)) return false;
  await compatiblePatch(admin, token, patch, input.identity.publicId);
  await input.assertBundleVersion();
  const pending = await compatiblePatch(admin, token, patch, input.identity.publicId);
  await savePendingPatch(admin, input, pending);
  return true;
}

async function savePendingPatch(
  admin: AdminClient,
  input: ContentSyncInput,
  patch: ProductContentPatch,
): Promise<void> {
  if (!hasPatch(patch)) return;
  await input.beforeMutation();
  await updateProductContent(admin, {
    productId: input.identity.productId,
    publicId: input.identity.publicId,
    patch,
  });
}

function assertTokenIdentity(token: ContentVersionPayload, input: ContentSyncInput): void {
  const expected = input.identity;
  const exact = token.shopDomain === expected.shopDomain && token.bundleId === expected.bundleId
    && token.productId === expected.productId && token.lockVersion === expected.lockVersion;
  if (!exact) throw new BundleContentError("The signed content token does not match this bundle. Reload and try again.", 400);
}

function submittedPatch(
  token: ContentVersionPayload,
  input: ContentSyncInput,
): ProductContentPatch {
  const content = input.submission;
  const patch: ProductContentPatch = {};
  if (contentFieldHash(content.title) !== token.titleHash) patch.title = content.title;
  const changed = contentFieldHash(content.descriptionHtml) !== token.descriptionHash;
  if (content.descriptionDirty && changed) patch.descriptionHtml = content.descriptionHtml;
  return patch;
}

function assertValidPatch(patch: ProductContentPatch): void {
  const errors = validateContentPatch(patch);
  if (!Object.keys(errors).length) return;
  throw new BundleContentError("Fix the Shopify content fields before saving.", 422, errors);
}

async function compatiblePatch(
  admin: AdminClient,
  token: ContentVersionPayload,
  patch: ProductContentPatch,
  publicId: string,
): Promise<ProductContentPatch> {
  const live = await readProductContent(admin, token.productId, publicId);
  const errors = liveConflicts(live, token, patch);
  if (Object.keys(errors).length) {
    throw new BundleContentError("Shopify content changed in another session. Reload before saving.", 409, errors);
  }
  return remainingPatch(live, token, patch);
}

function liveConflicts(
  live: ShopifyProductContent,
  token: ContentVersionPayload,
  patch: ProductContentPatch,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const titleConflict = patch.title !== undefined && contentFieldHash(live.title) !== token.titleHash
    && live.title !== patch.title;
  if (titleConflict) {
    errors.title = "Title changed in Shopify after this page was opened.";
  }
  const descriptionConflict = patch.descriptionHtml !== undefined
    && contentFieldHash(live.descriptionHtml) !== token.descriptionHash
    && !descriptionsSemanticallyEqual(live.descriptionHtml, patch.descriptionHtml);
  if (descriptionConflict) {
    errors.description = "Description changed in Shopify after this page was opened.";
  }
  return errors;
}

function remainingPatch(
  live: ShopifyProductContent,
  token: ContentVersionPayload,
  patch: ProductContentPatch,
): ProductContentPatch {
  const remaining: ProductContentPatch = {};
  if (patch.title !== undefined && contentFieldHash(live.title) === token.titleHash) remaining.title = patch.title;
  if (patch.descriptionHtml !== undefined && contentFieldHash(live.descriptionHtml) === token.descriptionHash) {
    remaining.descriptionHtml = patch.descriptionHtml;
  }
  return remaining;
}

function hasPatch(patch: ProductContentPatch): boolean {
  return patch.title !== undefined || patch.descriptionHtml !== undefined;
}
