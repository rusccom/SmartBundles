import type { BundleSelectorInput, BundleVariantInput } from "../bundle.types";

export interface EditorOption extends BundleVariantInput { allowed: boolean }

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
  selectors: BundleSelectorInput[];
}

export type SetSelectors = React.Dispatch<React.SetStateAction<EditorSelector[]>>;
