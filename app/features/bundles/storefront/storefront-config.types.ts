import type { StorefrontTexts } from "../../settings/storefront-text.types";
import type { BundleSelectorInput } from "../bundle.types";

export interface StorefrontSelector extends Pick<BundleSelectorInput,
  "key" | "productId" | "quantity" | "discountPercent"> {
  options: Array<{ id: string }>;
}

export interface StorefrontConfig {
  sv: 5;
  en: 0 | 1;
  b: string;
  parentVariantId: string;
  pricing: { mode: "fixed" | "dynamic"; discountPercent: string };
  selectors: StorefrontSelector[];
  texts: StorefrontTexts;
}
