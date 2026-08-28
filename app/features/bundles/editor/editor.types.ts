import type { StorefrontTexts } from "../../settings/storefront-text.types";
import type { BundleSelectorInput, BundleVariantInput } from "../bundle.types";
import type { ShopifyProductImage } from "../content/content.types";
import type { BundleMediaDraft } from "./bundle-media.types";

export interface EditorOption extends BundleVariantInput {
  allowed: boolean;
}

export interface EditorSelector extends Omit<BundleSelectorInput, "options"> {
  productImageUrl?: string;
  options: EditorOption[];
}

export interface BundleEditorInitial {
  id?: string;
  title: string;
  descriptionHtml: string;
  image: ShopifyProductImage | null;
  creationToken?: string;
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: string;
  discountPercent: string;
  status: "ACTIVE" | "DRAFT";
  currencyCode: string;
  locale: string;
  texts: StorefrontTexts;
  selectors: EditorSelector[];
}

export type SetSelectors = React.Dispatch<React.SetStateAction<EditorSelector[]>>;

export interface BundleEditorDraft {
  title: string;
  descriptionHtml: string;
  media: BundleMediaDraft;
  desiredStatus: "ACTIVE" | "DRAFT";
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: string;
  discountPercent: string;
  selectors: EditorSelector[];
}
