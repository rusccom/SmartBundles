import { createHash } from "node:crypto";
import type {
  BundleSelectorInput,
  PresentationConfig,
  RuntimeConfig,
} from "./bundle.types";

const MAX_RUNTIME_BYTES = 9_500;
const MAX_UNIQUE_VARIANTS = 200;

export function buildRuntimeConfig(
  publicId: string,
  revision: number,
  parentVariantId: string,
  selectors: BundleSelectorInput[],
): RuntimeConfig {
  const dictionary: Array<[string, number]> = [];
  const indexes = new Map<string, number>();
  const slots = selectors.map((selector) => buildSlot(selector, dictionary, indexes));
  const config: RuntimeConfig = {
    sv: 1, rv: revision, en: 1, b: publicId,
    p: parentVariantId, c: dictionary, s: slots,
  };
  assertRuntimeLimits(config);
  return config;
}

function buildSlot(
  selector: BundleSelectorInput,
  dictionary: Array<[string, number]>,
  indexes: Map<string, number>,
): { k: number; o: number[] } {
  const options = selector.options.map(({ id }) => variantIndex(id, dictionary, indexes));
  return { k: selector.key, o: [...new Set(options)] };
}

function variantIndex(
  id: string,
  dictionary: Array<[string, number]>,
  indexes: Map<string, number>,
): number {
  const token = variantToken(id);
  const existing = indexes.get(token);
  if (existing !== undefined) return existing;
  const index = dictionary.length;
  dictionary.push([token, 1]);
  indexes.set(token, index);
  return index;
}

function variantToken(id: string): string {
  const match = /^gid:\/\/shopify\/ProductVariant\/([1-9]\d*)$/.exec(id);
  if (!match) throw new Error("Allowed variant ID is invalid.");
  return match[1];
}

export function buildPresentationConfig(
  publicId: string,
  revision: number,
  parentVariantId: string,
  selectors: BundleSelectorInput[],
): PresentationConfig {
  return { sv: 1, rv: revision, en: 1, b: publicId, parentVariantId, selectors };
}

export function jsonProjection(value: unknown): string {
  return JSON.stringify(value);
}

export function projectionHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function disabledRuntime(value: RuntimeConfig): RuntimeConfig {
  return { ...value, en: 0 };
}

function assertRuntimeLimits(config: RuntimeConfig): void {
  const bytes = Buffer.byteLength(JSON.stringify(config), "utf8");
  if (config.c.length > MAX_UNIQUE_VARIANTS) throw new Error("Too many unique allowed variants.");
  if (bytes > MAX_RUNTIME_BYTES) throw new Error("Bundle runtime configuration is too large.");
}
