import { MAX_RUNTIME_COMPONENTS, MAX_SELECTORS, MIN_SELECTORS } from "./constants.js";
import {
  isObject,
  isDiscountPercent,
  isQuantity,
  isRevision,
  isSelectorKey,
  isUnitPrice,
  isVariantGid,
  isVariantToken,
} from "./validation.js";

export function readRuntime(line) {
  const value = line.merchandise.product.bundleRuntime?.jsonValue;
  if (!isRuntimeHeader(value)) return null;
  const components = readComponents(value.c, value.m);
  if (!components) return null;
  const selectors = readSelectors(value.s, components, value.m);
  return selectors ? {
    rv: value.rv, mode: value.m, discountPercent: value.d,
    parentVariantId: value.p, components, selectors,
  } : null;
}

export function isDisabledRuntime(value) {
  if (!isObject(value) || value.sv !== 3 || value.en !== 0) return false;
  if (!isRevision(value.rv) || !isVariantGid(value.p)) return false;
  return typeof value.b === "string" && value.b.length > 0 && value.b.length <= 128;
}

function isRuntimeHeader(value) {
  if (!isObject(value) || value.sv !== 3 || value.en !== 1) return false;
  if (!isRevision(value.rv) || !isVariantGid(value.p)) return false;
  if (value.m !== 0 && value.m !== 1) return false;
  if (!isDiscountPercent(value.d)) return false;
  return typeof value.b === "string" && value.b.length > 0 && value.b.length <= 128;
}

function readComponents(value, mode) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_RUNTIME_COMPONENTS) return null;
  const components = value.map((component) => readComponent(component, mode));
  return components.every(Boolean) ? components : null;
}

function readComponent(value, mode) {
  const expectedLength = mode === 1 ? 3 : 2;
  if (!Array.isArray(value) || value.length !== expectedLength) return null;
  if (!isVariantToken(value[0]) || !isQuantity(value[1])) return null;
  if (mode === 1 && !isUnitPrice(value[2])) return null;
  return { variantId: `gid://shopify/ProductVariant/${value[0]}`, quantity: value[1], unitPrice: value[2] };
}

function readSelectors(value, components, mode) {
  if (!Array.isArray(value) || !validSelectorCount(value.length)) return null;
  const selectors = value.map((selector) => readSelector(selector, components, mode));
  if (!selectors.every(Boolean) || !uniqueKeys(selectors)) return null;
  return selectors;
}

function readSelector(value, components, mode) {
  if (!isObject(value) || !isSelectorKey(value.k) || !Array.isArray(value.o)) return null;
  if (!isDiscountPercent(value.d)) return null;
  if (mode === 0 && Number(value.d) !== 0) return null;
  if (value.o.length < 1 || new Set(value.o).size !== value.o.length) return null;
  if (!value.o.every((index) => validIndex(index, components.length))) return null;
  return uniqueVariants(value.o, components)
    ? { key: value.k, options: value.o, discountPercent: value.d }
    : null;
}

function uniqueKeys(selectors) {
  return new Set(selectors.map(({ key }) => key)).size === selectors.length;
}

function uniqueVariants(indexes, components) {
  const ids = indexes.map((index) => components[index].variantId);
  return new Set(ids).size === ids.length;
}

function validIndex(value, length) {
  return Number.isSafeInteger(value) && value >= 0 && value < length;
}

function validSelectorCount(length) {
  return length >= MIN_SELECTORS && length <= MAX_SELECTORS;
}
