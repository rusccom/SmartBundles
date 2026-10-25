import type { EditorSelector } from "./editor.types";

export function BundleComponentHealth({ selector }: { selector: EditorSelector }) {
  const message = componentMessage(selector);
  if (!message) return null;
  return <s-banner tone={selector.options.some(({ allowed }) => allowed) ? "warning" : "critical"}>
    {message}
  </s-banner>;
}

function componentMessage(selector: EditorSelector): string | undefined {
  if (selector.productMissing) return "This product no longer exists or cannot be accessed. Replace or remove this component.";
  if (!selector.options.length) return "Shopify returned no variants. Reload the page after the product finishes updating.";
  if (!selector.options.some(({ allowed }) => allowed)) {
    return "No selected variants remain. Choose variants to make this bundle available again. New variants are not selected automatically.";
  }
  if (selector.missingVariantCount) return `${selector.missingVariantCount} previously selected variants were removed from Shopify. Remaining selections are preserved.`;
  return undefined;
}
