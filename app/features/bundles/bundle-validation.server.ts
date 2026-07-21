import type {
  BundleContentSubmission,
  BundleDraftInput,
  BundlePricingMode,
  BundleSelectorInput,
  BundleValidationResult,
  BundleVariantInput,
} from "./bundle.types";
import { buildRuntimeConfig } from "./bundle-config.server";
import { calculateParentPrice } from "./bundle-pricing";

export const MIN_SELECTORS = 1;
export const MAX_SELECTORS = 150;
const MAX_OPTIONS = 200;
const MAX_QUANTITY = 2_000;

export function parseBundleForm(form: FormData): BundleValidationResult {
  const draft = bundleDraft(form);
  const content = contentSubmission(form);
  const bundleVersion = parseBundleVersion(rawValue(form, "bundleVersion"));
  const errors = validateBundle(draft);
  if (!validPricingMode(rawValue(form, "pricingMode"))) errors.pricingMode = "Choose a pricing mode.";
  if (bundleVersion === undefined) errors.form = "The bundle version is invalid. Reload and try again.";
  if (!validDirtyValue(rawValue(form, "descriptionDirty"))) errors.description = "Description state is invalid.";
  if (bundleVersion === undefined) return { errors };
  const data = { draft, content, bundleVersion, creationToken: rawValue(form, "creationToken") };
  return { data, errors };
}

function bundleDraft(form: FormData): BundleDraftInput {
  const pricingMode = parsedPricingMode(rawValue(form, "pricingMode"));
  return {
    pricingMode,
    fixedPrice: pricingMode === "FIXED" ? optionalMoney(textValue(form, "fixedPrice")) : null,
    selectors: parseSelectors(textValue(form, "selectors")),
  };
}

function contentSubmission(form: FormData): BundleContentSubmission {
  return {
    title: rawValue(form, "title"),
    descriptionHtml: rawValue(form, "descriptionHtml"),
    descriptionDirty: rawValue(form, "descriptionDirty") === "yes",
    contentVersionToken: rawValue(form, "contentVersionToken"),
  };
}

function textValue(form: FormData, key: string): string {
  return rawValue(form, key).trim();
}

function rawValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function parseBundleVersion(value: string): number | null | undefined {
  if (value === "new") return null;
  if (!/^\d+$/.test(value)) return undefined;
  const version = Number(value);
  return Number.isSafeInteger(version) ? version : undefined;
}

function validDirtyValue(value: string): boolean {
  return value === "yes" || value === "no";
}

function parseSelectors(value: string): BundleSelectorInput[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.flatMap(parseSelector) : [];
  } catch {
    return [];
  }
}

function parseSelector(value: unknown, position: number): BundleSelectorInput[] {
  if (!isRecord(value)) return [];
  const options = Array.isArray(value.options) ? value.options.flatMap(parseOption) : [];
  const productTitle = shortText(value.productTitle, 255);
  return [{
    key: positiveInt(value.key) || position + 1,
    label: productTitle,
    productId: gid(value.productId, "Product"),
    productTitle,
    quantity: quantity(value.quantity),
    options,
  }];
}

function parseOption(value: unknown): BundleVariantInput[] {
  if (!isRecord(value)) return [];
  const id = gid(value.id, "ProductVariant");
  const title = shortText(value.title, 255);
  if (!id || !title) return [];
  return [{
    id, title, imageUrl: optionalUrl(value.imageUrl),
    available: value.available !== false,
    unitPrice: optionalMoney(value.unitPrice) ?? undefined,
  }];
}

function validateBundle(data: BundleDraftInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data.pricingMode === "FIXED" && !validFixedPrice(data.fixedPrice)) {
    errors.fixedPrice = "Enter a fixed price greater than 0.";
  }
  validateSelectorCount(data.selectors, errors);
  validateSelectors(data, errors);
  validateAggregateQuantities(data.selectors, errors);
  validateParentPrice(data, errors);
  validateRuntimeProjection(data, errors);
  return errors;
}

function validateParentPrice(
  data: BundleDraftInput,
  errors: Record<string, string>,
): void {
  if (errors.fixedPrice || errors.selectors || Object.keys(errors).some((key) => key.startsWith("selector."))) return;
  try {
    calculateParentPrice(data.pricingMode, data.fixedPrice, data.selectors);
  } catch {
    errors.selectors = "The maximum bundle total exceeds the supported price limit.";
  }
}

function validateRuntimeProjection(
  data: BundleDraftInput,
  errors: Record<string, string>,
): void {
  if (errors.selectors || Object.keys(errors).some((key) => key.startsWith("selector."))) return;
  try {
    buildRuntimeConfig(runtimeSizeIdentity(data), data.selectors);
  } catch (error) {
    errors.selectors = error instanceof Error ? error.message : "Bundle configuration is too large.";
  }
}

function runtimeSizeIdentity(data: BundleDraftInput) {
  return {
    publicId: "x".repeat(32), revision: 2_147_483_647,
    parentVariantId: "gid://shopify/ProductVariant/99999999999999999999",
    pricingMode: data.pricingMode, currencyCode: "XXX",
    fixedPrice: data.fixedPrice, parentPrice: "9999999999.99",
  };
}

function validateAggregateQuantities(
  selectors: BundleSelectorInput[],
  errors: Record<string, string>,
): void {
  const quantities = new Map<string, number>();
  for (const selector of selectors) {
    const variantIds = new Set(selector.options.map(({ id }) => id));
    for (const id of variantIds) {
      const total = (quantities.get(id) ?? 0) + selector.quantity;
      quantities.set(id, total);
      if (total > MAX_QUANTITY) {
        errors.selectors = `Combined quantity for one variant cannot exceed ${MAX_QUANTITY}.`;
      }
    }
  }
}

function validateSelectorCount(
  selectors: BundleSelectorInput[],
  errors: Record<string, string>,
): void {
  if (selectors.length < MIN_SELECTORS) errors.selectors = `Add at least ${MIN_SELECTORS} components.`;
  if (selectors.length > MAX_SELECTORS) errors.selectors = `A bundle can contain up to ${MAX_SELECTORS} components.`;
  const optionCount = selectors.reduce((sum, item) => sum + item.options.length, 0);
  if (optionCount > MAX_OPTIONS) errors.selectors = `A bundle can contain up to ${MAX_OPTIONS} allowed variants.`;
}

function validateSelectors(
  data: BundleDraftInput,
  errors: Record<string, string>,
): void {
  const keys = new Set<number>();
  data.selectors.forEach((selector, index) =>
    validateSelector(selector, index, data.pricingMode, keys, errors));
  const invalid = Object.keys(errors).some((key) => key.startsWith("selector."));
  if (invalid && !errors.selectors) errors.selectors = "Each component needs a label and at least one allowed variant.";
}

function validateSelector(
  item: BundleSelectorInput, index: number, pricingMode: BundlePricingMode,
  keys: Set<number>, errors: Record<string, string>,
): void {
  if (!item.productId) errors[`selector.${index}.product`] = "Choose a product.";
  if (!item.label) errors[`selector.${index}.label`] = "Enter a component label.";
  if (item.quantity < 1 || item.quantity > MAX_QUANTITY) {
    errors[`selector.${index}.quantity`] = `Quantity must be between 1 and ${MAX_QUANTITY}.`;
  }
  if (!item.options.length) errors[`selector.${index}.options`] = "Choose at least one allowed variant.";
  if (pricingMode === "DYNAMIC" && item.options.some(({ unitPrice }) => unitPrice === undefined)) {
    errors[`selector.${index}.options`] = "Dynamic bundle variants need current prices.";
  }
  if (new Set(item.options.map(({ id }) => id)).size !== item.options.length) {
    errors[`selector.${index}.options`] = "Allowed variants must be unique.";
  }
  if (keys.has(item.key)) errors.selectors = "Component identifiers must be unique.";
  keys.add(item.key);
}

function validFixedPrice(value: string | null): boolean {
  return value !== null && validMoney(value) && Number(value) > 0;
}

function positiveInt(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : 0;
}

function quantity(value: unknown): number {
  return Number.isSafeInteger(value) ? Number(value) : 0;
}

function parsedPricingMode(value: string): BundlePricingMode {
  return value === "DYNAMIC" ? "DYNAMIC" : "FIXED";
}

function validPricingMode(value: string): boolean {
  return value === "FIXED" || value === "DYNAMIC";
}

function optionalMoney(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return validMoney(normalized) ? normalized : null;
}

function validMoney(value: string): boolean {
  return /^\d{1,10}(\.\d{1,2})?$/.test(value);
}

function shortText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("https://")) return undefined;
  return value.slice(0, 2_000);
}

function gid(value: unknown, type: string): string {
  const prefix = `gid://shopify/${type}/`;
  if (typeof value !== "string" || !value.startsWith(prefix)) return "";
  return /^[1-9]\d*$/.test(value.slice(prefix.length)) ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
