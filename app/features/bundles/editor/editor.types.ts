import type { BundleSelectorInput, BundleVariantInput } from "../bundle.types";

export interface EditorOption extends BundleVariantInput {
  allowed: boolean;
}

export interface EditorSelector extends Omit<BundleSelectorInput, "options"> {
  options: EditorOption[];
}

export interface BundleEditorInitial {
  id?: string;
  title: string;
  descriptionHtml: string;
  creationToken?: string;
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: string;
  discountPercent: string;
  status: "ACTIVE" | "DRAFT";
  currencyCode: string;
  locale: string;
  selectors: EditorSelector[];
}

export type SetSelectors = React.Dispatch<React.SetStateAction<EditorSelector[]>>;

export interface BundleEditorDraft {
  title: string;
  descriptionHtml: string;
  desiredStatus: "ACTIVE" | "DRAFT";
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: string;
  discountPercent: string;
  selectors: EditorSelector[];
}
