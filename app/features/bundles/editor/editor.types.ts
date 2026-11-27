import type { StorefrontTexts } from "../../settings/storefront-text.types";
import type { BundleSelectorInput } from "../bundle.types";
import type { ShopifyProductImage } from "../content/content.types";
import type { BundleMediaDraft } from "./bundle-media.types";

export interface EditorOption {
  id: string;
  title: string;
  imageUrl?: string;
  available?: boolean;
  unitPrice?: string;
  allowed: boolean;
}

export interface EditorProductCatalog {
  id: string;
  title: string;
  imageUrl?: string;
  options: EditorOption[];
}

export interface EditorSelector extends Omit<BundleSelectorInput, "options"> {
  productTitle: string;
  productImageUrl?: string;
  productMissing?: boolean;
  missingVariantCount?: number;
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
