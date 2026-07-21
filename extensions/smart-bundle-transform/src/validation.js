import {
  MAX_COMPONENT_QUANTITY,
  PRODUCT_VARIANT_GID,
  PRODUCT_VARIANT_TOKEN,
} from "./constants.js";

export function hasExactKeys(value, expected) {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isQuantity(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_COMPONENT_QUANTITY;
}

export function isRevision(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isSelectorKey(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function isVariantGid(value) {
  return typeof value === "string" && PRODUCT_VARIANT_GID.test(value);
}

export function isVariantToken(value) {
  return typeof value === "string" && PRODUCT_VARIANT_TOKEN.test(value);
}
