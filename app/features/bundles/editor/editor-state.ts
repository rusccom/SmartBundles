import type { EditorSelector } from "./editor.types";
import { isSimpleBundleComponent } from "./bundle-component-presentation";

export function initialEditorSelectors(selectors: EditorSelector[]): EditorSelector[] {
  return selectors.map((selector) => ({
    ...selector,
    label: selector.productTitle,
    options: selector.options.map((option) => ({
      ...option,
      allowed: isSimpleBundleComponent(selector) || option.allowed,
    })),
  }));
}

export function serializedSelectors(selectors: EditorSelector[]): string {
  const clean = selectors.map((selector) => ({
    ...selector,
    label: selector.productTitle,
    options: selector.options.filter((option) => isSimpleBundleComponent(selector) || option.allowed).map(serializedOption),
  }));
  return JSON.stringify(clean);
}

function serializedOption(option: EditorSelector["options"][number]) {
  return {
    id: option.id,
    title: option.title,
    imageUrl: option.imageUrl,
    available: option.available,
  };
}

export function reorderSelectors(items: EditorSelector[], activeKey: number, overKey: number) {
  const from = items.findIndex(({ key }) => key === activeKey);
  const to = items.findIndex(({ key }) => key === overKey);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
