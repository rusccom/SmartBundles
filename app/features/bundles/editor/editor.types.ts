import type { BundleSelectorInput, BundleVariantInput } from "../bundle.types";

export interface EditorOption extends BundleVariantInput {
  allowed: boolean;
}

export interface EditorSelector extends Omit<BundleSelectorInput, "options"> {
  options: EditorOption[];
}

export interface BundleEditorInitial {
  id?: string;
  version: string;
  editorRevision: number | null;
  title: string;
  descriptionHtml: string;
  contentVersionToken?: string;
  creationToken?: string;
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: string;
  discountPercent: string;
  status: string;
  currencyCode: string;
  locale: string;
  selectors: EditorSelector[];
}

export interface BundleEditorRecovery {
  state: "ready" | "waiting" | "recovered";
  message?: string;
}

export type SetSelectors = React.Dispatch<React.SetStateAction<EditorSelector[]>>;

export interface BundleEditorDraft {
  title: string;
  descriptionHtml: string;
  descriptionDirty: boolean;
  desiredStatus: "ACTIVE" | "DRAFT";
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: string;
  discountPercent: string;
  selectors: EditorSelector[];
  replacementId: string;
}
