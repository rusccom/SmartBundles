import type { BundleSelectorInput } from "../bundle.types";
import type { EditorSelector } from "./editor.types";

export function initialEditorSelectors(selectors: BundleSelectorInput[]): EditorSelector[] {
  return selectors.map((selector) => ({
    ...selector,
    options: selector.options.map((option) => ({ ...option, allowed: true })),
  }));
}

export function serializedSelectors(selectors: EditorSelector[]): string {
  const clean = selectors.map((selector) => ({
    ...selector,
    options: selector.options.filter(({ allowed }) => allowed).map(stripAllowed),
  }));
  return JSON.stringify(clean);
}

function stripAllowed(option: EditorSelector["options"][number]) {
  return {
    id: option.id,
    title: option.title,
    imageUrl: option.imageUrl,
    available: option.available,
  };
}

export function moveSelector(items: EditorSelector[], from: number, offset: number) {
  const to = from + offset;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
