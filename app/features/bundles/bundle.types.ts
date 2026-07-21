export interface BundleVariantInput {
  id: string;
  title: string;
  imageUrl?: string;
  available?: boolean;
  unitPrice?: string;
}

export interface BundleSelectorInput {
  key: number;
  label: string;
  productId: string;
  productTitle: string;
  quantity: number;
  options: BundleVariantInput[];
}

export type BundlePricingMode = "FIXED" | "DYNAMIC";

export interface BundleDraftInput {
  pricingMode: BundlePricingMode;
  fixedPrice: string | null;
  selectors: BundleSelectorInput[];
}

export interface BundleContentSubmission {
  title: string;
  descriptionHtml: string;
  descriptionDirty: boolean;
  contentVersionToken: string;
}

export interface BundleEditorSubmission {
  draft: BundleDraftInput;
  content: BundleContentSubmission;
  bundleVersion: number | null;
  creationToken: string;
}

export interface BundleValidationResult {
  data?: BundleEditorSubmission;
  errors: Record<string, string>;
}

export interface RuntimeConfig {
  sv: 2;
  rv: number;
  en: 0 | 1;
  b: string;
  p: string;
  m: 0 | 1;
  c: Array<[string, number] | [string, number, string]>;
  s: Array<{ k: number; o: number[] }>;
}

export interface PresentationConfig {
  sv: 2;
  rv: number;
  en: 0 | 1;
  b: string;
  parentVariantId: string;
  pricing: PresentationPricing;
  selectors: BundleSelectorInput[];
}

export type PresentationPricing =
  | { mode: "fixed"; currencyCode: string; amount: string }
  | { mode: "dynamic"; currencyCode: string; maximumAmount: string };
