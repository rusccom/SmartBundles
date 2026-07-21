import type { BundleSelectorInput, BundleVariantInput } from "../bundle.types";

export interface EditorOption extends BundleVariantInput {
  allowed: boolean;
  displayPrice?: string;
}

export interface EditorSelector extends Omit<BundleSelectorInput, "options"> {
  options: EditorOption[];
}

export interface BundleEditorInitial {
  id?: string;
  version: string;
  title: string;
  descriptionHtml: string;
  contentVersionToken?: string;
  creationToken?: string;
  price: string;
  status: string;
  currencyCode: string;
  locale: string;
  selectors: EditorSelector[];
}

export type SetSelectors = React.Dispatch<React.SetStateAction<EditorSelector[]>>;
