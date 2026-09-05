export function cartItems(element) {
  const components = [...element.querySelectorAll("[data-component]")];
  const selected = window.SmartBundleCore.selectedInput;
  if (element.dataset.priceMode === "fixed") {
    const s = components.map((component) => [JSON.parse(component.dataset.selectorKey), selected(component)?.value]);
    return [{ id: element.dataset.parentVariantId, quantity: 1, properties: { _sb: JSON.stringify({ s }) } }];
  }
  const group = crypto.randomUUID();
  return [...groupVariants(components, selected).values()].map(({ id, quantity, keys }) => ({
    id, quantity,
    properties: { _sb: JSON.stringify({ b: element.dataset.bundleId, g: group, s: keys }) },
  }));
}

function groupVariants(components, selected) {
  const variants = new Map();
  for (const component of components) {
    const id = selected(component)?.value.split("/").pop();
    const item = variants.get(id) || { id, quantity: 0, keys: [] };
    item.quantity += Number(component.dataset.quantity);
    item.keys.push(JSON.parse(component.dataset.selectorKey));
    variants.set(id, item);
  }
  return variants;
}

if (typeof window !== "undefined") window.SmartBundleCart = Object.freeze({ cartItems });
