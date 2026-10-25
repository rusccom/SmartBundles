import { useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { EditorSelector, SetSelectors } from "./editor.types";

const MAX_SELECTORS = 150;

export function useProductPicker(selectors: EditorSelector[], setSelectors: SetSelectors) {
  const shopify = useAppBridge();
  return useCallback(async () => {
    const selectionIds = [...new Set(selectors.map(({ productId }) => productId))].map((id) => ({ id }));
    const selected = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: MAX_SELECTORS,
      selectionIds,
      filter: { variants: false, query: selectableProductsQuery(selectionIds) },
    });
    if (selected) setSelectors((current) => reconcileProducts(current, selected));
  }, [selectors, setSelectors, shopify]);
}

function selectableProductsQuery(selectionIds: Array<{ id: string }>): string {
  const existing = selectionIds.map(({ id }) => `id:${id.split("/").pop()}`);
  return ["status:active,unlisted", ...existing].join(" OR ");
}

function reconcileProducts(current: EditorSelector[], products: PickedProduct[]): EditorSelector[] {
  const remaining = new Map(products.map((product) => [product.id, product]));
  const retained = current.filter(({ productId }) => remaining.delete(productId));
  const availableSlots = Math.max(0, MAX_SELECTORS - retained.length);
  const firstKey = nextKey(current);
  const added = [...remaining.values()].slice(0, availableSlots)
    .map((product, index) => selectedProduct(product, firstKey + index));
  return [...retained, ...added];
}

function nextKey(selectors: EditorSelector[]): number {
  return Math.max(0, ...selectors.map(({ key }) => key)) + 1;
}

function selectedProduct(product: PickedProduct, key: number): EditorSelector {
  return {
    key,
    quantity: 1,
    discountPercent: "0",
    label: product.title,
    productId: product.id,
    productTitle: product.title,
    productImageUrl: product.images[0]?.originalSrc,
    options: product.variants.flatMap((variant) => pickedOption(product, variant)),
  };
}

function pickedOption(product: PickedProduct, variant: PickedVariant) {
  if (!variant.id) return [];
  const imageUrl = variant.image?.originalSrc ?? product.images[0]?.originalSrc;
  const available = variant.availableForSale ?? variant.inventoryQuantity !== 0;
  const unitPrice = variant.price;
  return [{ id: variant.id, title: variant.title || "Default", imageUrl, available, allowed: true, unitPrice }];
}

interface PickedProduct {
  id: string;
  title: string;
  images: Array<{ originalSrc: string }>;
  variants: PickedVariant[];
}

interface PickedVariant {
  id?: string;
  title?: string;
  availableForSale?: boolean;
  inventoryQuantity?: number | null;
  price?: string;
  image?: { originalSrc: string } | null;
}
