import type { ErrorContext } from "./error.types";

const CONTEXT_KEYS = new Set([
  "bundleId", "productId", "selectorKeys", "variantIds", "operation", "route", "webhookId", "topic", "errorName",
]);

export function safeErrorText(value: string): string {
  return value.slice(0, 4_000)
    .replace(/https?:\/\/[^\s"<>]+/gi, (url) => url.split(/[?#]/)[0])
    .replace(/(?:Bearer\s+\S+|(?:shpat|shpca|shpss)_[\w-]+)/gi, "[redacted]")
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, "[redacted]")
    .replace(/((?:access_?token|refresh_?token|password|secret|authorization|cookie|hmac|id_token)\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
}

export function safeErrorContext(context: ErrorContext = {}): ErrorContext {
  const entries = Object.entries(context).filter(([key]) => CONTEXT_KEYS.has(key));
  return Object.fromEntries(entries.map(([key, value]) => [key, safeValue(key, value)]));
}

function safeValue(key: string, value: unknown): string | number[] | string[] {
  if (key === "selectorKeys" && Array.isArray(value)) return value.filter(Number.isSafeInteger).slice(0, 150);
  if (key === "variantIds" && Array.isArray(value)) return value.filter(isVariantId).slice(0, 200);
  const text = typeof value === "string" ? value : "";
  return safeErrorText(key === "route" ? text.split(/[?#]/)[0] : text).slice(0, 500);
}

function isVariantId(value: unknown): value is string {
  return typeof value === "string" && /^gid:\/\/shopify\/ProductVariant\/[1-9]\d*$/.test(value);
}
