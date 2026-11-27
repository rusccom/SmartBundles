import type { EditorSelector } from "./editor.types";

export function serializedSelectors(selectors: EditorSelector[]): string {
  const clean = selectors.map((selector) => ({
    key: selector.key,
    productId: selector.productId,
    quantity: selector.quantity,
    discountPercent: selector.discountPercent,
    variantIds: selector.options.filter(({ allowed }) => allowed).map(({ id }) => id),
  }));
  return JSON.stringify(clean);
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

export function setSelectorOptions(items: EditorSelector[], index: number, ids: string[]) {
  const selected = new Set(ids);
  return items.map((selector, current) =>
    current === index
      ? { ...selector, options: selector.options.map((option) => ({ ...option, allowed: selected.has(option.id) })) }
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
