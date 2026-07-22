import { MAX_COMPONENT_QUANTITY, MAX_SELECTION_BYTES } from "./constants.js";
import { hasExactKeys, isObject, isSelectorKey, isVariantGid } from "./validation.js";

export function readSelection(value, runtime) {
  const input = parseAttribute(value);
  if (!input || input.rv !== runtime.rv) return null;
  const pairs = readPairs(input.s, runtime.selectors.length);
  if (!pairs) return null;
  const components = resolveComponents(pairs, runtime);
  return components ? aggregateComponents(components) : null;
}

function parseAttribute(value) {
  if (typeof value !== "string" || value.length > MAX_SELECTION_BYTES) return null;
  try {
    const parsed = JSON.parse(value);
    return isObject(parsed) && hasExactKeys(parsed, ["rv", "s"]) ? parsed : null;
  } catch {
    return null;
  }
}

function readPairs(value, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) return null;
  const pairs = value.map(readPair);
  if (!pairs.every(Boolean)) return null;
  return new Set(pairs.map(({ key }) => key)).size === pairs.length ? pairs : null;
}

function readPair(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  if (!isSelectorKey(value[0]) || !isVariantGid(value[1])) return null;
  return { key: value[0], variantId: value[1] };
}

function resolveComponents(pairs, runtime) {
  const byKey = new Map(pairs.map((pair) => [pair.key, pair.variantId]));
  const resolved = runtime.selectors.map((selector) => resolveSelector(selector, byKey, runtime.components));
  return resolved.every(Boolean) ? resolved : null;
}

function resolveSelector(selector, byKey, components) {
  const selectedId = byKey.get(selector.key);
  if (!selectedId) return null;
  const matches = selector.options.filter((index) => components[index].variantId === selectedId);
  if (matches.length !== 1) return null;
  return { ...components[matches[0]], discountPercent: selector.discountPercent };
}

function aggregateComponents(components) {
  const totals = new Map();
  for (const component of components) {
    const key = `${component.variantId}\u0000${component.discountPercent}`;
    const current = totals.get(key);
    if (current && current.unitPrice !== component.unitPrice) return null;
    const quantity = (current?.quantity || 0) + component.quantity;
    if (quantity > MAX_COMPONENT_QUANTITY) return null;
    totals.set(key, { ...component, quantity });
  }
  return [...totals.values()].map(({ variantId, ...component }) => ({ merchandiseId: variantId, ...component }));
}
