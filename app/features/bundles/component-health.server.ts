import { errorManager } from "../errors/error-manager.server";
import type { BundleSelectorInput } from "./bundle.types";

export const COMPONENT_ERROR_CODE = "BUNDLE_COMPONENT_VARIANTS_MISSING";

export async function recordComponentHealth(shopId: string, bundleId: string, selectors: BundleSelectorInput[]) {
  const missing = selectors.filter(({ options }) => !options.length);
  if (!missing.length) return errorManager.resolve(shopId, COMPONENT_ERROR_CODE, bundleId);
  await errorManager.report("A component has no selected variants remaining in Shopify. Choose replacement variants or remove the component.", {
    code: COMPONENT_ERROR_CODE, source: "bundle", shopId,
    context: { bundleId, selectorKeys: missing.map(({ key }) => key), productId: missing[0].productId },
  });
}
