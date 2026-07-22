import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest, assertNoUserErrors } from "../shopify/admin-api.server";
import {
  PUBLISH_PRODUCT,
  READ_PRODUCT,
  SET_METAFIELDS,
  UNPUBLISH_PRODUCT,
  UPDATE_PRODUCT,
  UPDATE_VARIANT,
} from "./bundle-graphql.server";

export interface ParentProductIds {
  productId: string;
  variantId: string;
}

interface UserError { message: string }

export async function updateParentVariant(
  admin: AdminClient,
  input: ParentProductIds & { price: string; compareAtPrice: string | null },
): Promise<void> {
  const variants = [{
    id: input.variantId, price: input.price,
    compareAtPrice: input.compareAtPrice, requiresComponents: true,
  }];
  const result = await adminRequest<UpdateVariantResult>(admin, UPDATE_VARIANT, { productId: input.productId, variants });
  assertNoUserErrors(result.productVariantsBulkUpdate.userErrors, "Bundle variant update failed");
}

interface UpdateVariantResult {
  productVariantsBulkUpdate: { userErrors: UserError[] };
}

export interface MetafieldWrite {
  key: "bundle_runtime" | "bundle_presentation";
  value: string;
  compareDigest?: string | null;
}

export async function writeProductMetafields(
  admin: AdminClient,
  productId: string,
  writes: MetafieldWrite[],
) {
  const metafields = writes.map((write) => metafieldInput(productId, write));
  const result = await adminRequest<SetMetafieldsResult>(admin, SET_METAFIELDS, { metafields });
  assertNoUserErrors(result.metafieldsSet.userErrors, "Bundle configuration update failed");
  return result.metafieldsSet.metafields ?? [];
}

function metafieldInput(ownerId: string, write: MetafieldWrite) {
  return { ownerId, namespace: "$app", type: "json", ...write };
}

interface SetMetafieldsResult {
  metafieldsSet: {
    metafields?: Array<{ id: string; key: string; compareDigest: string; value: string }> | null;
    userErrors: UserError[];
  };
}

export async function setProductStatus(
  admin: AdminClient,
  input: { id: string; status: "ACTIVE" | "DRAFT" },
): Promise<void> {
  const result = await adminRequest<UpdateProductResult>(admin, UPDATE_PRODUCT, { product: input });
  assertNoUserErrors(result.productUpdate.userErrors, "Bundle product update failed");
}

interface UpdateProductResult { productUpdate: { userErrors: UserError[] } }

export async function publishProduct(
  admin: AdminClient,
  productId: string,
  publicationId: string,
): Promise<void> {
  const result = await adminRequest<PublishResult>(admin, PUBLISH_PRODUCT, publicationVariables(productId, publicationId));
  assertNoUserErrors(result.publishablePublish.userErrors, "Bundle publication failed");
}

export async function unpublishProduct(
  admin: AdminClient,
  productId: string,
  publicationId: string,
): Promise<void> {
  const result = await adminRequest<UnpublishResult>(admin, UNPUBLISH_PRODUCT, publicationVariables(productId, publicationId));
  assertNoUserErrors(result.publishableUnpublish.userErrors, "Bundle unpublish failed");
}

function publicationVariables(id: string, publicationId: string) {
  return { id, input: [{ publicationId }] };
}

interface PublishResult { publishablePublish: { userErrors: UserError[] } }
interface UnpublishResult { publishableUnpublish: { userErrors: UserError[] } }

export async function readProductState(
  admin: AdminClient,
  productId: string,
  publicationId: string,
) {
  const result = await adminRequest<ReadProductResult>(admin, READ_PRODUCT, { id: productId, publicationId });
  if (!result.product) throw new Error("Bundle product no longer exists.");
  return result.product;
}

interface ReadProductResult {
  product?: {
    id: string;
    status: string;
    publishedOnPublication: boolean;
    variants: { nodes: Array<{
      id: string; requiresComponents: boolean; price: string; compareAtPrice: string | null;
    }> };
    bundleId?: { value: string } | null;
    runtime?: { id: string; value: string; compareDigest: string } | null;
    presentation?: { id: string; value: string; compareDigest: string } | null;
  } | null;
}
