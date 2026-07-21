import { useCallback, useState } from "react";
import { initialEditorSelectors, reorderSelectors } from "./editor-state";
import type { BundleEditorInitial } from "./editor.types";
import { useProductPicker } from "./useProductPicker";
import { isSimpleBundleComponent } from "./bundle-component-presentation";

export function useBundleEditor(initial: BundleEditorInitial) {
  const [selectors, setSelectors] = useState(() => initialEditorSelectors(initial.selectors));
  const addComponent = useProductPicker(setSelectors);
  const remove = useCallback((index: number) => setSelectors((items) => items.filter((_, i) => i !== index)), []);
  const reorder = useCallback((activeKey: number, overKey: number) =>
    setSelectors((items) => reorderSelectors(items, activeKey, overKey)), []);
  const option = useCallback((index: number, id: string) => setSelectors((items) => toggleOption(items, index, id)), []);
  const quantity = useCallback((index: number, value: number) =>
    setSelectors((items) => updateQuantity(items, index, value)), []);
  return { selectors, addComponent, remove, reorder, option, quantity };
}

function toggleOption(items: ReturnType<typeof initialEditorSelectors>, index: number, id: string) {
  return items.map((selector, i) => i === index && !isSimpleBundleComponent(selector) ? {
    ...selector,
    options: selector.options.map((option) => option.id === id ? { ...option, allowed: !option.allowed } : option),
  } : selector);
}

function updateQuantity(items: ReturnType<typeof initialEditorSelectors>, index: number, quantity: number) {
  return items.map((selector, current) => current === index ? { ...selector, quantity } : selector);
}
