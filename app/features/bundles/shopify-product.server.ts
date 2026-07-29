import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest, assertNoUserErrors } from "../shopify/admin-api.server";
import {
  PUBLISH_PRODUCT,
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
}

export async function writeProductMetafields(
  admin: AdminClient,
  productId: string,
  writes: MetafieldWrite[],
): Promise<void> {
  const metafields = writes.map((write) => metafieldInput(productId, write));
  const result = await adminRequest<SetMetafieldsResult>(admin, SET_METAFIELDS, { metafields });
  assertNoUserErrors(result.metafieldsSet.userErrors, "Bundle configuration update failed");
}

function metafieldInput(ownerId: string, write: MetafieldWrite) {
  return { ownerId, namespace: "$app", type: "json", ...write };
}

interface SetMetafieldsResult {
  metafieldsSet: { userErrors: UserError[] };
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
