import { useCallback } from "react";
import {
  clearSelectorDiscounts,
  reorderSelectors,
  setSelectorDiscount,
  setSelectorQuantity,
  toggleSelectorOption,
} from "./editor-state";
import type {
  BundleEditorDraft,
  SetSelectors,
} from "./editor.types";
import { useProductPicker } from "./useProductPicker";

export function useBundleDraftActions(
  setDraft: React.Dispatch<React.SetStateAction<BundleEditorDraft>>,
) {
  const setSelectors = useSelectorSetter(setDraft);
  const addComponent = useProductPicker(setSelectors);
  const patch = useCallback((value: Partial<BundleEditorDraft>) =>
    setDraft((current) => ({ ...current, ...value })), [setDraft]);
  const remove = useCallback((index: number) => setSelectors((items) =>
    items.filter((_, current) => current !== index)), [setSelectors]);
  const reorder = useCallback((active: number, over: number) =>
    setSelectors((items) => reorderSelectors(items, active, over)), [setSelectors]);
  const option = useCallback((index: number, id: string) =>
    setSelectors((items) => toggleSelectorOption(items, index, id)), [setSelectors]);
  const quantity = useCallback((index: number, value: number) =>
    setSelectors((items) => setSelectorQuantity(items, index, value)), [setSelectors]);
  const discount = useCallback((index: number, value: string) =>
    setSelectors((items) => setSelectorDiscount(items, index, value)), [setSelectors]);
  return { patch, addComponent, remove, reorder, option, quantity, discount,
    changePricingMode: usePricingModeChange(setDraft) };
}

function useSelectorSetter(
  setDraft: React.Dispatch<React.SetStateAction<BundleEditorDraft>>,
): SetSelectors {
  return useCallback((update) => setDraft((current) => ({
    ...current,
    selectors: typeof update === "function" ? update(current.selectors) : update,
  })), [setDraft]);
}

function usePricingModeChange(
  setDraft: React.Dispatch<React.SetStateAction<BundleEditorDraft>>,
) {
  return useCallback((pricingMode: BundleEditorDraft["pricingMode"]) => {
    setDraft((current) => ({
      ...current,
      pricingMode,
      selectors: pricingMode === "FIXED"
        ? clearSelectorDiscounts(current.selectors)
        : current.selectors,
    }));
  }, [setDraft]);
}
