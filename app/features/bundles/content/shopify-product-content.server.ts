import type { AdminClient } from "../../shopify/admin-api.server";
import { adminRequest, assertNoUserErrors } from "../../shopify/admin-api.server";
import {
  CREATE_PRODUCT,
  FIND_PARENT_PRODUCT,
  READ_PRODUCT_CONTENT,
  READ_PRODUCT_TITLES,
  UPDATE_PRODUCT,
} from "../bundle-graphql.server";
import type { ParentProductIds } from "../shopify-product.server";
import { descriptionsSemanticallyEqual } from "../../rich-text/description/description-sanitize.server";
import { BundleContentError } from "./BundleContentError.server";
import type {
  ParentProductContentInput,
  ProductContentPatch,
  ShopifyProductContent,
} from "./content.types";

interface ProductNode {
  id: string;
  title: string;
  descriptionHtml: string;
  updatedAt: string;
  identity?: { value: string } | null;
}

interface ProductTitleNode {
  id: string;
  title: string;
  identity?: { value: string } | null;
}

interface UserError { message: string }

export async function readProductContent(
  admin: AdminClient,
  productId: string,
  publicId?: string,
): Promise<ShopifyProductContent> {
  return upstream(
    () => requestProductContent(admin, productId, publicId),
    "Shopify product content could not be loaded.",
  );
}

async function requestProductContent(
  admin: AdminClient,
  productId: string,
  publicId?: string,
): Promise<ShopifyProductContent> {
  const result = await adminRequest<{ product?: ProductNode | null }>(admin, READ_PRODUCT_CONTENT, { id: productId });
  if (!result.product) throw new BundleContentError("The Shopify product no longer exists.", 409);
  const content = toContent(result.product);
  if (publicId && content.bundlePublicId !== publicId) throw identityConflict();
  return content;
}

export async function readProductTitles(
  admin: AdminClient,
  productIds: string[],
): Promise<Map<string, ProductTitleNode>> {
  if (!productIds.length) return new Map();
  return upstream(
    () => requestProductTitles(admin, productIds),
    "Shopify product titles could not be loaded.",
  );
}

async function requestProductTitles(
  admin: AdminClient,
  productIds: string[],
): Promise<Map<string, ProductTitleNode>> {
  const ids = [...new Set(productIds)];
  const result = await adminRequest<{ nodes: Array<ProductTitleNode | null> }>(admin, READ_PRODUCT_TITLES, { ids });
  return new Map(result.nodes.filter(isProductTitleNode).map((node) => [node.id, node]));
}

export async function findOrCreateParentProduct(
  admin: AdminClient,
  input: ParentProductContentInput,
): Promise<ParentProductIds> {
  return upstream(async () => {
    const existing = await findParentProduct(admin, input.publicId);
    return existing ? existingParent(existing, input) : createParentProduct(admin, input);
  }, "Shopify bundle product could not be created.");
}

export async function updateProductContent(
  admin: AdminClient,
  input: { productId: string; publicId: string; patch: ProductContentPatch },
): Promise<ShopifyProductContent> {
  return upstream(
    () => requestProductUpdate(admin, input),
    "Shopify product content could not be saved.",
  );
}

async function requestProductUpdate(
  admin: AdminClient,
  input: { productId: string; publicId: string; patch: ProductContentPatch },
): Promise<ShopifyProductContent> {
  const product = { id: input.productId, ...input.patch };
  const result = await adminRequest<UpdateResult>(admin, UPDATE_PRODUCT, { product });
  assertNoUserErrors(result.productUpdate.userErrors, "Bundle product content update failed");
  return verifySavedContent(admin, input.productId, input.publicId, input.patch);
}

async function findParentProduct(
  admin: AdminClient,
  publicId: string,
): Promise<FoundParent | null> {
  const result = await adminRequest<FindResult>(admin, FIND_PARENT_PRODUCT, {
    identifier: { handle: parentHandle(publicId) },
  });
  return result.product ?? null;
}

function existingParent(
  product: FoundParent,
  input: ParentProductContentInput,
): ParentProductIds {
  const variant = product.variants.nodes[0];
  if (product.bundleId?.value !== input.publicId || product.variants.nodes.length !== 1 || !variant) {
    throw new BundleContentError("The deterministic bundle product handle is already in use.", 409);
  }
  assertPatch(toContent(product), targetPatch(input), false);
  return { productId: product.id, variantId: variant.id };
}

async function createParentProduct(
  admin: AdminClient,
  input: ParentProductContentInput,
): Promise<ParentProductIds> {
  const result = await adminRequest<CreateResult>(admin, CREATE_PRODUCT, { product: createInput(input) });
  assertNoUserErrors(result.productCreate.userErrors, "Bundle product creation failed");
  const created = result.productCreate.product;
  if (!created?.variants.nodes[0]) throw new Error("Shopify did not create a parent variant.");
  await verifySavedContent(admin, created.id, input.publicId, targetPatch(input));
  return { productId: created.id, variantId: created.variants.nodes[0].id };
}

async function verifySavedContent(
  admin: AdminClient,
  productId: string,
  publicId: string,
  patch: ProductContentPatch,
): Promise<ShopifyProductContent> {
  try {
    const content = await readProductContent(admin, productId, publicId);
    assertPatch(content, patch, true);
    return content;
  } catch (error) {
    if (error instanceof BundleContentError && error.productSaved) throw error;
    throw savedReadbackError(error);
  }
}

function savedReadbackError(error: unknown): BundleContentError {
  const errors = error instanceof BundleContentError ? error.errors : {};
  return new BundleContentError(
    "Shopify content was written, but it could not be verified. Reload before continuing.",
    502,
    errors,
    true,
  );
}

function createInput(input: ParentProductContentInput) {
  return {
    title: input.title,
    handle: parentHandle(input.publicId),
    descriptionHtml: input.descriptionHtml,
    status: "DRAFT",
    claimOwnership: { bundles: true },
    metafields: [{ namespace: "$app", key: "bundle_id", type: "single_line_text_field", value: input.publicId }],
  };
}

function targetPatch(input: ParentProductContentInput): ProductContentPatch {
  return { title: input.title, descriptionHtml: input.descriptionHtml };
}

function assertPatch(
  content: ShopifyProductContent,
  patch: ProductContentPatch,
  productSaved: boolean,
): void {
  const errors: Record<string, string> = {};
  if (patch.title !== undefined && content.title !== patch.title) errors.title = "Shopify title changed during save.";
  if (patch.descriptionHtml !== undefined && !descriptionMatches(content.descriptionHtml, patch.descriptionHtml)) {
    errors.description = "Shopify description changed during save.";
  }
  if (Object.keys(errors).length) throw postReadConflict(errors, productSaved);
}

function descriptionMatches(actual: string, expected: string): boolean {
  return actual === expected || descriptionsSemanticallyEqual(actual, expected);
}

function postReadConflict(errors: Record<string, string>, productSaved: boolean): BundleContentError {
  const message = productSaved
    ? "Shopify content was written, but the readback no longer matches. Reload before continuing."
    : "This Shopify product has different content. Reload before continuing.";
  return new BundleContentError(message, productSaved ? 502 : 409, errors, productSaved);
}

function parentHandle(publicId: string): string {
  return `smartbundle-${publicId}`.toLowerCase();
}

function toContent(product: ProductNode): ShopifyProductContent {
  return {
    productId: product.id,
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    updatedAt: product.updatedAt,
    bundlePublicId: product.identity?.value ?? null,
  };
}

function isProductTitleNode(value: ProductTitleNode | null): value is ProductTitleNode {
  return Boolean(value?.id);
}

function identityConflict(): BundleContentError {
  return new BundleContentError("The Shopify product is no longer owned by this bundle.", 409);
}

async function upstream<T>(operation: () => Promise<T>, message: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof BundleContentError) throw error;
    throw new BundleContentError(message, 502);
  }
}

interface FoundParent extends ProductNode {
  variants: { nodes: Array<{ id: string }> };
  bundleId?: { value: string } | null;
}

interface FindResult { product?: FoundParent | null }

interface CreateResult {
  productCreate: {
    product?: ProductNode & { variants: { nodes: Array<{ id: string }> } } | null;
    userErrors: UserError[];
  };
}

interface UpdateResult { productUpdate: { userErrors: UserError[] } }
