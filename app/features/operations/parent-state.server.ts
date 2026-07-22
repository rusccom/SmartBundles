import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest } from "../shopify/admin-api.server";

export interface MetafieldState {
  id: string;
  value: string;
  compareDigest: string;
}

export interface ParentState {
  status: string;
  publishedOnPublication: boolean;
  variants: { nodes: Array<{
    id: string; requiresComponents: boolean; price: string; compareAtPrice: string | null;
  }> };
  identity?: { value: string } | null;
  runtime?: MetafieldState | null;
  presentation?: MetafieldState | null;
}

const READ_PARENT = `#graphql
  query SmartBundleMaintenanceParent($id: ID!, $publicationId: ID!) {
    product(id: $id) {
      status
      publishedOnPublication(publicationId: $publicationId)
      variants(first: 2) { nodes { id requiresComponents price compareAtPrice } }
      identity: metafield(namespace: "$app", key: "bundle_id") { value }
      runtime: metafield(namespace: "$app", key: "bundle_runtime") { id value compareDigest }
      presentation: metafield(namespace: "$app", key: "bundle_presentation") { id value compareDigest }
    }
  }
`;

export async function readParentState(
  admin: AdminClient,
  productId: string,
  publicationId: string,
): Promise<ParentState | null> {
  const result = await adminRequest<{ product?: ParentState | null }>(admin, READ_PARENT, {
    id: productId,
    publicationId,
  });
  return result.product ?? null;
}
