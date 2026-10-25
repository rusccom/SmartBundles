import { useCallback, useRef, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { reportAdminError } from "../../errors/error-manager.client";
import type { EditorSelector, SetSelectors } from "./editor.types";
import { loadPickedProducts } from "./product-picker-catalog";
import { MAX_SELECTORS, reconcileProducts, selectableProductsQuery, selectedResources } from "./product-picker-selection";

export function useProductPicker(selectors: EditorSelector[], setSelectors: SetSelectors) {
  const shopify = useAppBridge();
  const [selectingProducts, setSelectingProducts] = useState(false);
  const pending = useRef(false);
  const addComponent = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setSelectingProducts(true);
    try { await pickProducts(shopify, selectors, setSelectors); }
    catch (error) {
      reportAdminError(error);
      shopify.toast.show("Unable to load product variants. Your components have not changed. Please try again.", { isError: true });
    } finally { pending.current = false; setSelectingProducts(false); }
  }, [selectors, setSelectors, shopify]);
  return { addComponent, selectingProducts };
}

async function pickProducts(shopify: ReturnType<typeof useAppBridge>, selectors: EditorSelector[], setSelectors: SetSelectors) {
  const selected = await shopify.resourcePicker({
    type: "product", action: "select", multiple: MAX_SELECTORS,
    selectionIds: selectedResources(selectors),
    filter: { variants: true, query: selectableProductsQuery(selectors) },
  });
  if (!selected) return;
  const products = await loadPickedProducts(selected);
  setSelectors((current) => reconcileProducts(current, products));
}
