import { SmartBundlePrice } from "../../../extensions/smart-bundle-theme/assets/smart-bundle-price.js";
import type { BundleDraftInput, BundlePricingMode } from "./bundle.types";

export interface BundlePrices {
  originalPrice: string;
  finalPrice: string;
  maximumOriginalPrice: string;
  maximumFinalPrice: string;
}

interface BundlePriceMechanism {
  calculate(input: BundleDraftInput): BundlePrices;
  compareAt(prices: BundlePrices): string | null;
}

export const bundlePrice = SmartBundlePrice as BundlePriceMechanism;

export function pricingModeCode(mode: BundlePricingMode): 0 | 1 {
  return mode === "DYNAMIC" ? 1 : 0;
}
