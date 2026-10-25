import { useState } from "react";
import type { EditorSelector } from "./editor.types";

export function useBundleVariantSelection(selector: EditorSelector, onConfirm: (ids: string[]) => void) {
  const [pending, setPending] = useState<string[] | null>(null);
  const ids = pending ?? selectedVariantIds(selector);
  return {
    selector: { ...selector, options: selector.options.map((option) => ({ ...option, allowed: ids.includes(option.id) })) },
    selectedCount: ids.length,
    begin: () => setPending(selectedVariantIds(selector)),
    cancel: () => setPending(null),
    toggle: (id: string) => setPending((current) => toggleVariantId(current ?? selectedVariantIds(selector), id)),
    confirm: () => onConfirm(ids),
  };
}

function selectedVariantIds(selector: EditorSelector): string[] {
  return selector.options.filter(({ allowed }) => allowed).map(({ id }) => id);
}

function toggleVariantId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}
