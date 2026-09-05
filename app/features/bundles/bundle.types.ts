import type { StorefrontTexts } from "../settings/storefront-text.types";

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
  discountPercent: string;
  options: BundleVariantInput[];
}

export type BundlePricingMode = "FIXED" | "DYNAMIC";
export type BundleDesiredStatus = "ACTIVE" | "DRAFT";

export interface BundleDraftInput {
  pricingMode: BundlePricingMode;
  fixedPrice: string | null;
  discountPercent: string;
  selectors: BundleSelectorInput[];
}

export interface BundleContentSubmission {
  title: string;
  descriptionHtml: string;
}

export interface BundleContentPatch {
  title?: string;
  descriptionHtml?: string;
}

export type BundleMediaSubmission =
  | { action: "keep" }
  | { action: "remove" }
  | { action: "component"; productId: string }
  | { action: "upload"; file: File };

export interface BundleEditorSubmission {
  draft: BundleDraftInput;
  content: BundleContentPatch;
  media: BundleMediaSubmission;
  desiredStatus: BundleDesiredStatus;
  configurationDirty: boolean;
  storedConfigurationDirty: boolean;
  creationToken: string;
}

export interface BundleValidationResult {
  data?: BundleEditorSubmission;
  errors: Record<string, string>;
}

export interface RuntimeConfig {
  sv: 4;
  en: 0 | 1;
  b: string;
  p: string;
  m: 0 | 1;
  d: string;
  c: Array<[string, number]>;
  s: Array<{ k: number; o: number[]; d: string }>;
}

export interface PresentationConfig {
  sv: 5;
  en: 0 | 1;
  b: string;
  parentVariantId: string;
  pricing: PresentationPricing;
  selectors: BundleSelectorInput[];
  texts: StorefrontTexts;
  moneySample: string;
  catalog: Array<BundleVariantInput & { productId: string; productTitle: string }>;
}

export type PresentationPricing =
  | { mode: "fixed"; currencyCode: string; originalAmount: string; amount: string; discountPercent: string }
  | { mode: "dynamic"; currencyCode: string; discountPercent: string };
