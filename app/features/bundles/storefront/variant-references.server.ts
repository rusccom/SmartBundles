import type { BundleSelectorInput } from "../bundle.types";
import type { MetafieldWrite } from "../shopify-product.server";

const REFERENCE_BATCH_SIZE = 50;
const REFERENCE_BATCH_COUNT = 4;

export function variantReferenceFields(selectors: BundleSelectorInput[]): MetafieldWrite[] {
  const ids = [...new Set(selectors.flatMap(({ options }) => options.map(({ id }) => id)))];
  if (ids.length > REFERENCE_BATCH_SIZE * REFERENCE_BATCH_COUNT) {
    throw new Error("Too many storefront variants.");
  }
  return Array.from({ length: REFERENCE_BATCH_COUNT }, (_, index) => ({
    key: `bundle_variants_${index + 1}` as MetafieldWrite["key"],
    type: "list.variant_reference",
    value: JSON.stringify(ids.slice(index * REFERENCE_BATCH_SIZE, (index + 1) * REFERENCE_BATCH_SIZE)),
  }));
}
