import type { StorefrontTexts } from "../../settings/storefront-text.types";
import type {
  BundleSelectorInput, BundleVariantInput, PresentationConfig,
} from "../bundle.types";
import { isSimpleBundleComponent } from "../editor/bundle-component-presentation";
import type { BundleEditorDraft, EditorOption, EditorSelector } from "../editor/editor.types";
import { previewPricing } from "./bundle-preview-pricing";

const PREVIEW_VARIANT_GID = "gid://shopify/ProductVariant/1";

export function bundlePreviewConfig(
  draft: BundleEditorDraft,
  currencyCode: string,
  texts: StorefrontTexts,
): PresentationConfig | null {
  const selectors = previewSelectors(draft.selectors);
  const pricing = previewPricing(selectors, draft, currencyCode);
  if (!pricing || !selectors.length) return null;
  return {
    sv: 4, en: 1, b: "preview",
    parentVariantId: PREVIEW_VARIANT_GID,
    pricing, selectors, texts,
  };
}

function previewSelectors(selectors: EditorSelector[]): BundleSelectorInput[] {
  return selectors.map((selector) => ({
    key: selector.key,
    label: selector.productTitle,
    productId: selector.productId,
    productTitle: selector.productTitle,
    quantity: selector.quantity,
    discountPercent: selector.discountPercent,
    options: allowedOptions(selector).map(previewOption),
  }));
}

function allowedOptions(selector: EditorSelector): EditorOption[] {
  if (isSimpleBundleComponent(selector)) return selector.options;
  return selector.options.filter((option) => option.allowed);
}

function previewOption(option: EditorOption): BundleVariantInput {
  return {
    id: option.id, title: option.title, imageUrl: option.imageUrl,
    available: option.available, unitPrice: option.unitPrice,
  };
}
