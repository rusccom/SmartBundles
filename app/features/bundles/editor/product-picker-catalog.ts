import type { EditorProductCatalog } from "./editor.types";

interface ProductSelection {
  id: string;
  variants: Array<{ id?: string }>;
}

export async function loadPickedProducts(selection: ProductSelection[]): Promise<EditorProductCatalog[]> {
  if (!selection.length) return [];
  const ids = [...new Set(selection.map(({ id }) => id))];
  const response = await fetch("/app/component-products", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids),
  });
  if (!response.ok) throw new Error("Unable to load component product variants.");
  const { products } = await response.json() as { products: EditorProductCatalog[] };
  return selection.map((selected) => selectedCatalogProduct(selected, products));
}

function selectedCatalogProduct(selected: ProductSelection, products: EditorProductCatalog[]): EditorProductCatalog {
  const product = products.find(({ id }) => id === selected.id);
  if (!product) throw new Error("A selected component product could not be loaded.");
  const allowedIds = new Set(selected.variants.map(({ id }) => id));
  return { ...product, options: product.options.map((option) => ({ ...option, allowed: allowedIds.has(option.id) })) };
}
