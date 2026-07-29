import type { AdminClient } from "../../shopify/admin-api.server";
import type { BundleTitleTarget, ShopifyProductSummary } from "./content.types";
import { productSummary, readProductTitles } from "./shopify-product-content.server";

export async function bundleProductMap(
  admin: AdminClient,
  bundles: BundleTitleTarget[],
): Promise<Map<string, ShopifyProductSummary>> {
  const productIds = bundles.map(({ parentProductGid }) => parentProductGid);
  const products = await readProductTitles(admin, productIds);
  return new Map(bundles.flatMap((bundle) => {
    const product = products.get(bundle.parentProductGid);
    if (!product || product.identity?.value !== bundle.publicId) return [];
    return [[bundle.publicId, productSummary(product)]];
  }));
}
