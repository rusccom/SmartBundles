import { useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { EditorSelector, SetSelectors } from "./editor.types";

const MAX_SELECTORS = 150;

export function useProductPicker(setSelectors: SetSelectors) {
  const shopify = useAppBridge();
  return useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      filter: { archived: false, draft: false, variants: true },
    });
    if (selected?.length) setSelectors((current) => appendProducts(current, selected));
  }, [setSelectors, shopify]);
}

function appendProducts(current: EditorSelector[], products: PickedProduct[]): EditorSelector[] {
  const availableSlots = Math.max(0, MAX_SELECTORS - current.length);
  const firstKey = nextKey(current);
  const added = products.slice(0, availableSlots).map((product, index) => selectedProduct(product, firstKey + index));
  return [...current, ...added];
}

function nextKey(selectors: EditorSelector[]): number {
  return Math.max(0, ...selectors.map(({ key }) => key)) + 1;
}

function selectedProduct(product: PickedProduct, key: number): EditorSelector {
  return {
    key,
    label: product.title,
    productId: product.id,
    productTitle: product.title,
    options: product.variants.flatMap((variant) => pickedOption(product, variant)),
  };
}

function pickedOption(product: PickedProduct, variant: PickedVariant) {
  if (!variant.id) return [];
  const imageUrl = variant.image?.originalSrc ?? product.images[0]?.originalSrc;
  const available = variant.availableForSale ?? variant.inventoryQuantity !== 0;
  const displayPrice = variant.price;
  return [{ id: variant.id, title: variant.title || "Default", imageUrl, available, allowed: true, displayPrice }];
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
