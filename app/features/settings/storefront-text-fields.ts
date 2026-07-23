import type {
  StorefrontTextFieldDefinition,
  StorefrontTextGroup,
} from "./storefront-text.types";

export const STOREFRONT_TEXT_GROUPS: StorefrontTextGroup[] = [
  "Main",
  "Selection",
  "Pricing",
  "Errors and availability",
];

export const STOREFRONT_TEXT_FIELDS: StorefrontTextFieldDefinition[] = [
  field("heading", "Widget heading", "Main", 80),
  field("buttonLabel", "Add bundle button", "Main", 80),
  field("addingLabel", "Button while adding", "Main", 80),
  field("addedLabel", "Button after adding", "Main", 80),
  field("addedStatus", "Added status", "Main", 120),
  field("progressTemplate", "Selection progress", "Selection", 120, { tokens: ["__selected__", "__total__"] }),
  field("selectOneMore", "Select one more", "Selection", 120),
  field("selectManyMoreTemplate", "Select multiple more", "Selection", 120, { tokens: ["__count__"] }),
  field("chooseVariant", "Choose variant", "Selection", 80),
  field("chooseVariantForTemplate", "Accessible variant instruction", "Selection", 120, { tokens: ["__product__"] }),
  field("quantityTemplate", "Quantity", "Selection", 80, { tokens: ["__quantity__"] }),
  field("soldOut", "Sold out", "Selection", 80),
  field("optionUnavailable", "No variants available", "Selection", 120),
  field("bundlePrice", "Bundle price", "Pricing", 80),
  field("total", "Total", "Pricing", 80),
  field("discountBadgeTemplate", "Discount badge", "Pricing", 80, { tokens: ["__discount__"] }),
  field("fixedPriceNote", "Fixed price note", "Pricing", 240, { multiline: true }),
  field("priceUnavailable", "Price unavailable", "Pricing", 120),
  field("bundleUnavailable", "Bundle unavailable", "Errors and availability", 120),
  field("addError", "Add to cart error", "Errors and availability", 240, { multiline: true }),
  field("javascriptRequired", "JavaScript required", "Errors and availability", 120),
];

function field(
  key: StorefrontTextFieldDefinition["key"],
  label: string,
  group: StorefrontTextGroup,
  maxLength: number,
  options: { tokens?: string[]; multiline?: boolean } = {},
): StorefrontTextFieldDefinition {
  return {
    key, label, group, maxLength,
    requiredTokens: options.tokens,
    multiline: options.multiline,
  };
}
