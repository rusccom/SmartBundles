import type { AdminClient } from "../../shopify/admin-api.server";
import type { BundleTitleTarget } from "./content.types";
import { readProductTitles } from "./shopify-product-content.server";

export async function bundleTitleMap(
  admin: AdminClient,
  bundles: BundleTitleTarget[],
): Promise<Map<string, string>> {
  const productIds = bundles.flatMap(({ parentProductGid }) => parentProductGid ? [parentProductGid] : []);
  const contents = await readProductTitles(admin, productIds);
  return new Map(bundles.map((bundle) => [bundle.publicId, resolvedTitle(bundle, contents)]));
}

function resolvedTitle(
  bundle: BundleTitleTarget,
  contents: Awaited<ReturnType<typeof readProductTitles>>,
): string {
  if (!bundle.parentProductGid) return "Unavailable bundle product";
  const product = contents.get(bundle.parentProductGid);
  if (product?.identity?.value !== bundle.publicId) return "Unavailable bundle product";
  return product.title;
}
