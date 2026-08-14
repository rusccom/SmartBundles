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
import type { BundleContentPatch } from "../bundle.types";
import { BundleContentError } from "./BundleContentError.server";
import type {
  ParentProductContentInput,
  ShopifyProductContent,
  ShopifyProductImage,
  ShopifyProductSummary,
} from "./content.types";

interface ProductNode {
  title: string;
  descriptionHtml: string;
  onlineStoreUrl: string | null;
  onlineStorePreviewUrl: string | null;
  media: { nodes: Array<{ image?: ShopifyProductImage | null }> };
  variants: { nodes: Array<{ id: string; price: string; compareAtPrice: string | null }> };
  identity?: { value: string } | null;
}

interface ProductTitleNode {
  id: string;
  title: string;
  variants: { nodes: Array<{ price: string; compareAtPrice: string | null }> };
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
  if (publicId && result.product.identity?.value !== publicId) throw identityConflict();
  return toContent(result.product);
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

export function productSummary(node: ProductTitleNode): ShopifyProductSummary {
  const variant = node.variants.nodes[0];
  return {
    title: node.title,
    price: variant?.price ?? null,
    compareAtPrice: variant?.compareAtPrice ?? null,
  };
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
    return existing
      ? reuseParentProduct(admin, existing, input)
      : createParentProduct(admin, input);
  }, "Shopify bundle product could not be created.");
}

export async function updateProductContent(
  admin: AdminClient,
  input: { productId: string; content: BundleContentPatch },
): Promise<void> {
  return upstream(
    () => requestProductUpdate(admin, input),
    "Shopify product content could not be saved.",
  );
}

async function requestProductUpdate(
  admin: AdminClient,
  input: { productId: string; content: BundleContentPatch },
): Promise<void> {
  const product = { id: input.productId, ...input.content };
  const result = await adminRequest<UpdateResult>(admin, UPDATE_PRODUCT, { product });
  assertNoUserErrors(result.productUpdate.userErrors, "Bundle product content update failed");
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
  return { productId: product.id, variantId: variant.id };
}

async function reuseParentProduct(
  admin: AdminClient,
  product: FoundParent,
  input: ParentProductContentInput,
): Promise<ParentProductIds> {
  const parent = existingParent(product, input);
  await requestProductUpdate(admin, {
    productId: parent.productId,
    content: { title: input.title, descriptionHtml: input.descriptionHtml },
  });
  return parent;
}

async function createParentProduct(
  admin: AdminClient,
  input: ParentProductContentInput,
): Promise<ParentProductIds> {
  const result = await adminRequest<CreateResult>(admin, CREATE_PRODUCT, { product: createInput(input) });
  assertNoUserErrors(result.productCreate.userErrors, "Bundle product creation failed");
  const created = result.productCreate.product;
  if (!created?.variants.nodes[0]) throw new Error("Shopify did not create a parent variant.");
  return { productId: created.id, variantId: created.variants.nodes[0].id };
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

function parentHandle(publicId: string): string {
  return `smartbundle-${publicId}`.toLowerCase();
}

function toContent(product: ProductNode): ShopifyProductContent {
  const variant = product.variants.nodes[0];
  if (!variant) throw new BundleContentError("The Shopify product has no bundle variant.", 409);
  return {
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    image: product.media.nodes[0]?.image ?? null,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    onlineStoreUrl: product.onlineStoreUrl,
    onlineStorePreviewUrl: product.onlineStorePreviewUrl,
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

interface FoundParent {
  id: string;
  variants: { nodes: Array<{ id: string }> };
  bundleId?: { value: string } | null;
}

interface FindResult { product?: FoundParent | null }

interface CreateResult {
  productCreate: {
    product?: { id: string; variants: { nodes: Array<{ id: string }> } } | null;
    userErrors: UserError[];
  };
}

interface UpdateResult { productUpdate: { userErrors: UserError[] } }
