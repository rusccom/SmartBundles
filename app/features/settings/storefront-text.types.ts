export interface StorefrontTexts {
  buttonLabel: string;
  selectOneMore: string;
  selectManyMoreTemplate: string;
  chooseVariant: string;
  chooseVariantForTemplate: string;
  quantityTemplate: string;
  soldOut: string;
  optionUnavailable: string;
  discountBadgeTemplate: string;
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
