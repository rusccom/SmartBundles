import type { AdminClient } from "../../shopify/admin-api.server";
import { adminRequest, assertNoUserErrors } from "../../shopify/admin-api.server";
import {
  ADD_PRODUCT_IMAGE,
  DELETE_PRODUCT_MEDIA,
  READ_PRIMARY_PRODUCT_IMAGE,
  READ_PRODUCT_MEDIA,
  REORDER_PRODUCT_MEDIA,
  STAGE_PRODUCT_IMAGE,
} from "../bundle-graphql.server";
import type { BundleMediaSubmission } from "../bundle.types";
import { BundleContentError } from "./BundleContentError.server";
import type { ShopifyProductImage } from "./content.types";

const MEDIA_ATTEMPTS = 20;
const MEDIA_POLL_MS = 500;

interface MediaNode {
  id: string;
  status: "READY" | "PROCESSING" | "UPLOADED" | "FAILED";
  image?: ShopifyProductImage | null;
}

interface MediaSource {
  originalSource: string;
  alt?: string;
}

interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
}

export async function saveBundleProductMedia(
  admin: AdminClient,
  productId: string,
  submission: BundleMediaSubmission,
): Promise<ShopifyProductImage | null | undefined> {
  if (submission.action === "keep") return undefined;
  try {
    const current = await readMedia(admin, productId);
    if (submission.action === "remove") return removePrimaryMedia(admin, productId, current);
    return await replaceMedia(admin, productId, current, submission);
  } catch (error) {
    if (error instanceof BundleContentError) throw error;
    throw new BundleContentError("Bundle product image could not be saved.", 502, {
      media: "Shopify could not save this image. Try again.",
    });
  }
}

async function replaceMedia(
  admin: AdminClient,
  productId: string,
  current: MediaNode[],
  submission: Exclude<BundleMediaSubmission, { action: "keep" | "remove" }>,
): Promise<ShopifyProductImage> {
  const source = await mediaSource(admin, submission);
  await createMedia(admin, productId, source);
  const created = await waitForCreatedImage(admin, productId, new Set(current.map(({ id }) => id)));
  await reorderMedia(admin, productId, created.id);
  return waitForPrimaryImage(admin, productId, created.id);
}

async function removePrimaryMedia(
  admin: AdminClient,
  productId: string,
  current: MediaNode[],
): Promise<ShopifyProductImage | null> {
  if (!current[0]) return null;
  await deleteMedia(admin, productId, [current[0].id]);
  return (await readMedia(admin, productId))[0]?.image ?? null;
}

function mediaSource(
  admin: AdminClient,
  submission: Exclude<BundleMediaSubmission, { action: "keep" | "remove" }>,
): Promise<MediaSource> {
  return submission.action === "component"
    ? componentSource(admin, submission.productId)
    : uploadSource(admin, submission.file);
}

async function componentSource(admin: AdminClient, productId: string): Promise<MediaSource> {
  const result = await adminRequest<PrimaryImageResult>(admin, READ_PRIMARY_PRODUCT_IMAGE, { id: productId });
  const image = result.product?.media.nodes[0]?.image;
  if (!image) throw new BundleContentError("The selected product has no image.", 422, {
    media: "Choose another component image.",
  });
  return { originalSource: image.url, alt: image.altText ?? result.product?.title };
}

async function uploadSource(admin: AdminClient, file: File): Promise<MediaSource> {
  const target = await stagedTarget(admin, file);
  const body = new FormData();
  target.parameters.forEach(({ name, value }) => body.append(name, value));
  body.append("file", file, file.name);
  const response = await fetch(target.url, { method: "POST", body });
  if (!response.ok) throw new Error(`Shopify staged upload failed with ${response.status}.`);
  return { originalSource: target.resourceUrl, alt: file.name };
}

async function stagedTarget(admin: AdminClient, file: File): Promise<StagedTarget> {
  const input = [{
    resource: "PRODUCT_IMAGE", filename: file.name, mimeType: file.type,
    httpMethod: "POST", fileSize: String(file.size),
  }];
  const result = await adminRequest<StagedUploadResult>(admin, STAGE_PRODUCT_IMAGE, { input });
  assertNoUserErrors(result.stagedUploadsCreate.userErrors, "Bundle image upload failed");
  const target = result.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error("Shopify did not create an image upload target.");
  return target;
}

async function createMedia(admin: AdminClient, productId: string, source: MediaSource): Promise<void> {
  const media = [{
    originalSource: source.originalSource,
    alt: source.alt,
    mediaContentType: "IMAGE",
  }];
  const result = await adminRequest<AddMediaResult>(admin, ADD_PRODUCT_IMAGE, {
    product: { id: productId }, media,
  });
  assertNoUserErrors(result.productUpdate.userErrors, "Bundle product image update failed");
}

async function waitForCreatedImage(
  admin: AdminClient,
  productId: string,
  previousIds: Set<string>,
): Promise<MediaNode & { image: ShopifyProductImage }> {
  for (let attempt = 0; attempt < MEDIA_ATTEMPTS; attempt += 1) {
    const created = (await readMedia(admin, productId)).find(({ id }) => !previousIds.has(id));
    if (created?.status === "FAILED") throw processingError();
    if (created?.status === "READY" && created.image) return { ...created, image: created.image };
    await pause(MEDIA_POLL_MS);
  }
  throw new Error("Shopify image processing timed out.");
}

async function reorderMedia(admin: AdminClient, productId: string, mediaId: string): Promise<void> {
  const result = await adminRequest<ReorderMediaResult>(admin, REORDER_PRODUCT_MEDIA, {
    id: productId, moves: [{ id: mediaId, newPosition: "0" }],
  });
  assertNoUserErrors(result.productReorderMedia.mediaUserErrors, "Bundle product image reorder failed");
}

async function waitForPrimaryImage(
  admin: AdminClient,
  productId: string,
  mediaId: string,
): Promise<ShopifyProductImage> {
  for (let attempt = 0; attempt < MEDIA_ATTEMPTS; attempt += 1) {
    const primary = (await readMedia(admin, productId))[0];
    if (primary?.id === mediaId && primary.image) return primary.image;
    await pause(MEDIA_POLL_MS);
  }
  throw new Error("Shopify image reordering timed out.");
}

async function readMedia(admin: AdminClient, productId: string): Promise<MediaNode[]> {
  const result = await adminRequest<ProductMediaResult>(admin, READ_PRODUCT_MEDIA, { id: productId });
  if (!result.product) throw new BundleContentError("The Shopify product no longer exists.", 409);
  return result.product.media.nodes;
}

async function deleteMedia(admin: AdminClient, productId: string, mediaIds: string[]): Promise<void> {
  if (!mediaIds.length) return;
  const result = await adminRequest<DeleteMediaResult>(admin, DELETE_PRODUCT_MEDIA, { productId, mediaIds });
  assertNoUserErrors(result.productDeleteMedia.mediaUserErrors, "Bundle product image removal failed");
}

function processingError(): BundleContentError {
  return new BundleContentError("Shopify could not process the selected image.", 422, {
    media: "Choose another image and try again.",
  });
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

interface ProductMediaResult { product?: { media: { nodes: MediaNode[] } } | null }
interface PrimaryImageResult {
  product?: { title: string; media: { nodes: Array<{ image?: ShopifyProductImage | null }> } } | null;
}
interface StagedUploadResult {
  stagedUploadsCreate: { stagedTargets: StagedTarget[]; userErrors: Array<{ message: string }> };
}
interface AddMediaResult { productUpdate: { userErrors: Array<{ message: string }> } }
interface DeleteMediaResult { productDeleteMedia: { mediaUserErrors: Array<{ message: string }> } }
interface ReorderMediaResult { productReorderMedia: { mediaUserErrors: Array<{ message: string }> } }
