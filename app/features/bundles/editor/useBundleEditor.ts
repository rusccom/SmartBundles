import { useCallback, useState } from "react";
import { initialEditorSelectors, moveSelector } from "./editor-state";
import type { BundleEditorInitial } from "./editor.types";
import { useProductPicker } from "./useProductPicker";

export function useBundleEditor(initial: BundleEditorInitial) {
  const [selectors, setSelectors] = useState(() => initialEditorSelectors(initial.selectors));
  const addComponent = useProductPicker(setSelectors);
  const remove = useCallback((index: number) => setSelectors((items) => items.filter((_, i) => i !== index)), []);
  const move = useCallback((index: number, offset: number) => setSelectors((items) => moveSelector(items, index, offset)), []);
  const label = useCallback((index: number, value: string) => setSelectors((items) => items.map((item, i) => i === index ? { ...item, label: value } : item)), []);
  const option = useCallback((index: number, id: string) => setSelectors((items) => toggleOption(items, index, id)), []);
  return { selectors, addComponent, remove, move, label, option };
}

function toggleOption(items: ReturnType<typeof initialEditorSelectors>, index: number, id: string) {
  return items.map((selector, i) => i === index ? {
    ...selector,
    options: selector.options.map((option) => option.id === id ? { ...option, allowed: !option.allowed } : option),
  } : selector);
}
