import type { StorefrontTexts } from "../../settings/storefront-text.types";
import type { BundleSelectorInput, CatalogVariant, PresentationConfig } from "../bundle.types";
import type { BundleEditorDraft, EditorSelector } from "../editor/editor.types";
import { previewPricing } from "./bundle-preview-pricing";

const PREVIEW_VARIANT_GID = "gid://shopify/ProductVariant/1";

export function bundlePreviewConfig(
  draft: BundleEditorDraft,
  currencyCode: string,
  texts: StorefrontTexts,
  locale: string,
): PresentationConfig | null {
  const selectors = draft.selectors.map(previewSelector);
  const pricing = previewPricing(selectors, draft, currencyCode);
  if (!pricing || !selectors.length) return null;
  return {
    sv: 5, en: 1, b: "preview",
    parentVariantId: PREVIEW_VARIANT_GID,
    pricing, selectors, texts,
    moneySample: previewMoneySample(currencyCode, locale),
    catalog: draft.selectors.flatMap(previewCatalog),
  };
}

function previewMoneySample(currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency", currency, currencyDisplay: "narrowSymbol", numberingSystem: "latn",
    }).format(1234567.89);
  } catch { return `1,234,567.89 ${currency}`; }
}

function previewSelector(selector: EditorSelector): BundleSelectorInput {
  return {
    key: selector.key,
    productId: selector.productId,
    quantity: selector.quantity,
    discountPercent: selector.discountPercent,
    options: selector.options.filter(({ allowed }) => allowed).map(({ id, unitPrice }) => ({ id, unitPrice })),
  };
}

function previewCatalog(selector: EditorSelector): CatalogVariant[] {
  return selector.options.filter(({ allowed }) => allowed).map((option) => ({
    id: option.id, title: option.title, imageUrl: option.imageUrl,
    available: option.available, unitPrice: option.unitPrice,
    productId: selector.productId, productTitle: selector.productTitle,
  }));
}
