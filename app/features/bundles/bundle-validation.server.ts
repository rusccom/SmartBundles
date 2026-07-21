import type {
  BundleContentSubmission,
  BundleDraftInput,
  BundleSelectorInput,
  BundleValidationResult,
  BundleVariantInput,
} from "./bundle.types";

export const MIN_SELECTORS = 1;
export const MAX_SELECTORS = 150;
const MAX_OPTIONS = 200;

export function parseBundleForm(form: FormData): BundleValidationResult {
  const draft = bundleDraft(form);
  const content = contentSubmission(form);
  const bundleVersion = parseBundleVersion(rawValue(form, "bundleVersion"));
  const errors = validateBundle(draft);
  if (bundleVersion === undefined) errors.form = "The bundle version is invalid. Reload and try again.";
  if (!validDirtyValue(rawValue(form, "descriptionDirty"))) errors.description = "Description state is invalid.";
  if (bundleVersion === undefined) return { errors };
  const data = { draft, content, bundleVersion, creationToken: rawValue(form, "creationToken") };
  return { data, errors };
}

function bundleDraft(form: FormData): BundleDraftInput {
  return {
    price: textValue(form, "price"),
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
  return [{
    key: positiveInt(value.key) || position + 1,
    label: shortText(value.label, 120),
    productId: gid(value.productId, "Product"),
    productTitle: shortText(value.productTitle, 255),
    options,
  }];
}

function parseOption(value: unknown): BundleVariantInput[] {
  if (!isRecord(value)) return [];
  const id = gid(value.id, "ProductVariant");
  const title = shortText(value.title, 255);
  if (!id || !title) return [];
  return [{ id, title, imageUrl: optionalUrl(value.imageUrl), available: value.available !== false }];
}

function validateBundle(data: BundleDraftInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!validPrice(data.price)) errors.price = "Enter a price greater than 0.";
  validateSelectorCount(data.selectors, errors);
  validateSelectors(data.selectors, errors);
  return errors;
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
  selectors: BundleSelectorInput[],
  errors: Record<string, string>,
): void {
  const keys = new Set<number>();
  selectors.forEach((selector, index) => validateSelector(selector, index, keys, errors));
  const invalid = Object.keys(errors).some((key) => key.startsWith("selector."));
  if (invalid && !errors.selectors) errors.selectors = "Each component needs a label and at least one allowed variant.";
}

function validateSelector(
  item: BundleSelectorInput,
  index: number,
  keys: Set<number>,
  errors: Record<string, string>,
): void {
  if (!item.productId) errors[`selector.${index}.product`] = "Choose a product.";
  if (!item.label) errors[`selector.${index}.label`] = "Enter a component label.";
  if (!item.options.length) errors[`selector.${index}.options`] = "Choose at least one allowed variant.";
  if (new Set(item.options.map(({ id }) => id)).size !== item.options.length) {
    errors[`selector.${index}.options`] = "Allowed variants must be unique.";
  }
  if (keys.has(item.key)) errors.selectors = "Component identifiers must be unique.";
  keys.add(item.key);
}

function validPrice(value: string): boolean {
  return /^\d{1,9}(\.\d{1,2})?$/.test(value) && Number(value) > 0;
}

function positiveInt(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : 0;
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
