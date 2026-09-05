import type { BundleSelectorInput, PresentationPricing } from "../bundle.types";
import { bundlePrice } from "../bundle-pricing";
import type { BundleEditorDraft } from "../editor/editor.types";

export function previewPricing(
  selectors: BundleSelectorInput[],
  draft: BundleEditorDraft,
  currencyCode: string,
): PresentationPricing | null {
  try {
    const prices = bundlePrice.calculate({ ...draft, selectors });
    return draft.pricingMode === "FIXED"
      ? fixedPricing(prices, draft.discountPercent, currencyCode)
      : { mode: "dynamic", currencyCode, discountPercent: draft.discountPercent };
  } catch {
    return null;
  }
}

function fixedPricing(
  prices: ReturnType<typeof bundlePrice.calculate>, discountPercent: string, currencyCode: string,
): PresentationPricing {
  return {
    mode: "fixed", currencyCode, discountPercent,
    originalAmount: prices.originalPrice, amount: prices.finalPrice,
  };
}
