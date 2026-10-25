import type { EditorProductCatalog, EditorSelector } from "./editor.types";

export const MAX_SELECTORS = 150;

export function selectedResources(selectors: EditorSelector[]) {
  const products = selectors.filter(hasSelectedVariants).map((selector) => ({
    id: selector.productId,
    variants: selector.options.filter(({ allowed }) => allowed).map(({ id }) => ({ id })),
  }));
  return [...new Map(products.map((product) => [product.id, product])).values()];
}

function hasSelectedVariants(selector: EditorSelector): boolean {
  return selector.options.some(({ allowed }) => allowed);
}

export function selectableProductsQuery(selectors: EditorSelector[]): string {
  const existing = selectors.map(({ productId }) => `id:${productId.split("/").pop()}`);
  return ["status:active,unlisted", ...existing].join(" OR ");
}

export function reconcileProducts(current: EditorSelector[], products: EditorProductCatalog[]): EditorSelector[] {
  const remaining = new Map(products.map((product) => [product.id, product]));
  const retained = current.flatMap((selector) => {
    const product = remaining.get(selector.productId);
    if (!product) return hasSelectedVariants(selector) ? [] : [selector];
    remaining.delete(selector.productId);
    return [updateProduct(selector, product)];
  });
  const availableSlots = Math.max(0, MAX_SELECTORS - retained.length);
  const firstKey = Math.max(0, ...current.map(({ key }) => key)) + 1;
  const added = [...remaining.values()].slice(0, availableSlots)
    .map((product, index) => selectedProduct(product, firstKey + index));
  return [...retained, ...added];
}

function updateProduct(selector: EditorSelector, product: EditorProductCatalog): EditorSelector {
  return { ...selector, productTitle: product.title, productImageUrl: product.imageUrl,
    productMissing: false, missingVariantCount: 0, options: product.options };
}

function selectedProduct(product: EditorProductCatalog, key: number): EditorSelector {
  return {
    key, quantity: 1, discountPercent: "0", label: product.title,
    productId: product.id, productTitle: product.title, productImageUrl: product.imageUrl,
    options: product.options,
  };
}
