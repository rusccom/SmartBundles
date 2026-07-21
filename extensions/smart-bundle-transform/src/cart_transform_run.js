import { NO_CHANGES } from "./constants.js";
import { readRuntime } from "./runtime.js";
import { readSelection } from "./selection.js";
import { isVariantGid } from "./validation.js";

/** @typedef {import("../generated/api").CartTransformRunInput} CartTransformRunInput */
/** @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult */

/**
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const operations = [];
  for (const line of input.cart.lines) {
    const expansion = expandLine(line);
    if (expansion) operations.push({ lineExpand: expansion });
  }
  return operations.length ? { operations } : NO_CHANGES;
}

function expandLine(line) {
  const variant = line.merchandise;
  if (variant.__typename !== "ProductVariant") return null;
  if (!isVariantGid(variant.id)) return null;
  const runtime = readRuntime(line);
  if (!runtime || runtime.parentVariantId !== variant.id) return null;
  const items = readSelection(line.bundleSelection?.value, runtime);
  if (!items) return null;
  return { cartLineId: line.id, expandedCartItems: items };
}
