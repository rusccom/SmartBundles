export interface StorefrontTexts {
  heading: string;
  buttonLabel: string;
  progressTemplate: string;
  selectOneMore: string;
  selectManyMoreTemplate: string;
  chooseVariant: string;
  chooseVariantForTemplate: string;
  quantityTemplate: string;
  soldOut: string;
  optionUnavailable: string;
  bundlePrice: string;
  total: string;
  discountBadgeTemplate: string;
  fixedPriceNote: string;
  priceUnavailable: string;
  bundleUnavailable: string;
  addingLabel: string;
  addedLabel: string;
  addedStatus: string;
  addError: string;
  javascriptRequired: string;
}

export type StorefrontTextKey = keyof StorefrontTexts;
export type StorefrontTextGroup = "Main" | "Selection" | "Pricing" | "Errors and availability";

export interface StorefrontTextSource {
  version: number;
  texts: StorefrontTexts;
}

export interface StorefrontTextFieldDefinition {
  key: StorefrontTextKey;
  label: string;
  group: StorefrontTextGroup;
  maxLength: number;
  multiline?: boolean;
  requiredTokens?: string[];
}

export interface StorefrontTextsParseResult {
  data?: StorefrontTexts;
  errors: Record<string, string>;
}
