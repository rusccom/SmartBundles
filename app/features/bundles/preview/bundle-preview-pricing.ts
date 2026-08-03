import type { BundleSelectorInput, PresentationPricing } from "../bundle.types";
import type { BundleEditorDraft } from "../editor/editor.types";

const HUNDRED = 100;

export function previewPricing(
  selectors: BundleSelectorInput[],
  draft: BundleEditorDraft,
  currencyCode: string,
): PresentationPricing | null {
  if (!validPercent(draft.discountPercent)) return null;
  if (draft.pricingMode === "FIXED") return fixedPricing(draft, currencyCode);
  return dynamicPricing(selectors, draft.discountPercent, currencyCode);
}

function fixedPricing(draft: BundleEditorDraft, currencyCode: string): PresentationPricing | null {
  const original = Number(draft.fixedPrice);
  if (!draft.fixedPrice || !Number.isFinite(original) || original < 0) return null;
  return {
    mode: "fixed", currencyCode, discountPercent: draft.discountPercent,
    originalAmount: original.toFixed(2),
    amount: discounted(original, 0, Number(draft.discountPercent)).toFixed(2),
  };
}

function dynamicPricing(
  selectors: BundleSelectorInput[],
  discountPercent: string,
  currencyCode: string,
): PresentationPricing | null {
  if (!selectors.length) return null;
  const original = maximumTotal(selectors, 0, false);
  const final = maximumTotal(selectors, Number(discountPercent), true);
  if (original === null || final === null) return null;
  return {
    mode: "dynamic", currencyCode, discountPercent,
    maximumOriginalAmount: original.toFixed(2), maximumAmount: final.toFixed(2),
  };
}

function maximumTotal(
  selectors: BundleSelectorInput[],
  bundlePercent: number,
  useComponentDiscount: boolean,
): number | null {
  return selectors.reduce<number | null>((total, selector) => {
    const highest = maximumOption(selector, bundlePercent, useComponentDiscount);
    return total === null || highest === null ? null : total + highest * selector.quantity;
  }, 0);
}

function maximumOption(
  selector: BundleSelectorInput,
  bundlePercent: number,
  useComponentDiscount: boolean,
): number | null {
  if (useComponentDiscount && !validPercent(selector.discountPercent)) return null;
  const percent = useComponentDiscount ? Number(selector.discountPercent) : 0;
  const prices = selector.options.map((option) => optionPrice(option, percent, bundlePercent));
  if (!prices.length || prices.some((price) => price === null)) return null;
  return Math.max(...(prices as number[]));
}

function optionPrice(
  option: BundleSelectorInput["options"][number],
  componentPercent: number,
  bundlePercent: number,
): number | null {
  const price = Number(option.unitPrice);
  if (option.unitPrice === undefined || !Number.isFinite(price)) return null;
  return discounted(price, componentPercent, bundlePercent);
}

function discounted(price: number, componentPercent: number, bundlePercent: number): number {
  const component = (HUNDRED - componentPercent) / HUNDRED;
  const bundle = (HUNDRED - bundlePercent) / HUNDRED;
  return Math.round(price * component * bundle * HUNDRED) / HUNDRED;
}

function validPercent(value: string): boolean {
  const percent = Number(value);
  return /^\d{1,3}(\.\d{1,2})?$/.test(value) && percent >= 0 && percent <= HUNDRED;
}
