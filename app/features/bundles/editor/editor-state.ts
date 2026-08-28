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
    key: selector.key,
    label: selector.productTitle,
    productId: selector.productId,
    productTitle: selector.productTitle,
    quantity: selector.quantity,
    discountPercent: selector.discountPercent,
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
    unitPrice: option.unitPrice,
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

export function toggleSelectorOption(items: EditorSelector[], index: number, id: string) {
  return items.map((selector, current) =>
    current === index && !isSimpleBundleComponent(selector)
      ? { ...selector, options: selector.options.map((option) =>
        option.id === id ? { ...option, allowed: !option.allowed } : option) }
      : selector);
}

export function setSelectorQuantity(
  items: EditorSelector[],
  index: number,
  quantity: number,
) {
  return items.map((selector, current) =>
    current === index ? { ...selector, quantity } : selector);
}

export function setSelectorDiscount(
  items: EditorSelector[],
  index: number,
  discountPercent: string,
) {
  return items.map((selector, current) =>
    current === index ? { ...selector, discountPercent } : selector);
}

export function clearSelectorDiscounts(items: EditorSelector[]) {
  return items.map((selector) =>
    selector.discountPercent === "0" ? selector : { ...selector, discountPercent: "0" });
}
