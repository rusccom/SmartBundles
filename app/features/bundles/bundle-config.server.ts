import { pricingModeCode } from "./bundle-pricing";
import type {
  BundlePricingMode,
  BundleSelectorInput,
  RuntimeConfig,
} from "./bundle.types";
import type { StorefrontTextSource } from "../settings/storefront-text.types";
import type { StorefrontConfig } from "./storefront/storefront-config.types";

const MAX_RUNTIME_BYTES = 9_500;
const MAX_RUNTIME_COMPONENTS = 200;

export interface BundleProjectionIdentity {
  publicId: string;
  parentVariantId: string;
  pricingMode: BundlePricingMode;
  discountPercent: string;
}

export function buildRuntimeConfig(
  identity: BundleProjectionIdentity,
  selectors: BundleSelectorInput[],
): RuntimeConfig {
  const dictionary: RuntimeConfig["c"] = [];
  const indexes = new Map<string, number>();
  const slots = selectors.map((selector) =>
    buildSlot(selector, dictionary, indexes));
  const config: RuntimeConfig = {
    sv: 4, en: 1, b: identity.publicId,
    p: identity.parentVariantId, m: pricingModeCode(identity.pricingMode),
    d: identity.discountPercent, c: dictionary, s: slots,
  };
  assertRuntimeLimits(config);
  return config;
}

function buildSlot(
  selector: BundleSelectorInput,
  dictionary: RuntimeConfig["c"],
  indexes: Map<string, number>,
): RuntimeConfig["s"][number] {
  const options = selector.options.map((option) =>
    componentIndex(option, selector.quantity, dictionary, indexes));
  return { k: selector.key, o: [...new Set(options)], d: selector.discountPercent };
}

function componentIndex(
  option: BundleSelectorInput["options"][number],
  quantity: number,
  dictionary: RuntimeConfig["c"],
  indexes: Map<string, number>,
): number {
  const component: RuntimeConfig["c"][number] = [variantToken(option.id), quantity];
  const key = JSON.stringify(component);
  const existing = indexes.get(key);
  if (existing !== undefined) return existing;
  const index = dictionary.length;
  dictionary.push(component);
  indexes.set(key, index);
  return index;
}

function variantToken(id: string): string {
  const match = /^gid:\/\/shopify\/ProductVariant\/([1-9]\d*)$/.exec(id);
  if (!match) throw new Error("Allowed variant ID is invalid.");
  return match[1];
}

export function buildPresentationConfig(
  identity: BundleProjectionIdentity,
  selectors: BundleSelectorInput[],
  textSource: StorefrontTextSource,
): StorefrontConfig {
  return {
    sv: 5, en: 1, b: identity.publicId,
    parentVariantId: identity.parentVariantId,
    pricing: { mode: identity.pricingMode === "FIXED" ? "fixed" : "dynamic", discountPercent: identity.discountPercent },
    selectors: selectors.map(({ key, productId, quantity, discountPercent, options }) => ({
      key, productId, quantity, discountPercent, options: options.map(({ id }) => ({ id })),
    })),
    texts: textSource.texts,
  };
}

export function disabledRuntime(
  publicId: string,
  parentVariantId: string,
) {
  return { sv: 4 as const, en: 0 as const, b: publicId, p: parentVariantId };
}

function assertRuntimeLimits(config: RuntimeConfig): void {
  const bytes = Buffer.byteLength(JSON.stringify(config), "utf8");
  if (config.c.length > MAX_RUNTIME_COMPONENTS) throw new Error("Too many runtime components.");
  if (bytes > MAX_RUNTIME_BYTES) throw new Error("Bundle runtime configuration is too large.");
}
