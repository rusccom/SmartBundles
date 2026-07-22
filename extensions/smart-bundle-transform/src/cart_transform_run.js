import { NO_CHANGES } from "./constants.js";
import { isDisabledRuntime, readRuntime } from "./runtime.js";
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
    const expansion = expandLine(line, input.presentmentCurrencyRate);
    if (expansion) operations.push({ lineExpand: expansion });
  }
  return operations.length ? { operations } : NO_CHANGES;
}

function expandLine(line, presentmentCurrencyRate) {
  const variant = line.merchandise;
  if (variant.__typename !== "ProductVariant" || !isVariantGid(variant.id)) return null;
  const projection = variant.product.bundleRuntime;
  if (!projection) return null;
  if (isDisabledRuntime(projection.jsonValue)) return null;
  const runtime = readRuntime(line);
  if (!runtime || runtime.parentVariantId !== variant.id) return invalidBundle();
  const items = readSelection(line.bundleSelection?.value, runtime);
  if (!items) return invalidBundle();
  const currencyCode = line.cost.amountPerQuantity.currencyCode;
  const expandedCartItems = expandedItems(
    items, runtime.mode, runtime.discountPercent, presentmentCurrencyRate, currencyCode);
  return expandedCartItems ? { cartLineId: line.id, expandedCartItems } : invalidBundle();
}

function invalidBundle() {
  throw new Error("Invalid SmartBundle composition.");
}

function expandedItems(items, mode, discountPercent, presentmentCurrencyRate, currencyCode) {
  if (mode === 0) return items.map(withoutPrice);
  const rate = Number(presentmentCurrencyRate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const expanded = items.map((item) => dynamicItem(item, discountPercent, rate, currencyCode));
  return expanded.every(Boolean) ? expanded : null;
}

function withoutPrice({ merchandiseId, quantity }) {
  return { merchandiseId, quantity };
}

function dynamicItem(item, discountPercent, rate, currencyCode) {
  const amount = convertedAmount(
    item.unitPrice, item.discountPercent, discountPercent, rate, currencyCode);
  if (!amount) return null;
  return {
    merchandiseId: item.merchandiseId,
    quantity: item.quantity,
    price: { adjustment: { fixedPricePerUnit: { amount } } },
  };
}

const ZERO_DECIMAL = new Set(["AFN", "ALL", "BIF", "BYR", "CLP", "DJF", "GNF", "IQD", "IRR", "ISK", "JPY", "KMF", "KRW", "LAK", "LBP", "MGA", "MMK", "PYG", "RSD", "RWF", "SLL", "SOS", "STD", "SYP", "UGX", "VND", "VUV", "XAF", "XOF", "XPF", "YER"]);
const THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "LYD", "OMR", "TND"]);

function convertedAmount(unitPrice, componentDiscount, bundleDiscount, rate, currencyCode) {
  const decimals = currencyDecimals(currencyCode);
  if (decimals === null) return null;
  const scale = 10 ** decimals;
  const componentMultiplier = (100 - Number(componentDiscount)) / 100;
  const bundleMultiplier = (100 - Number(bundleDiscount)) / 100;
  const minor = Math.round(Number(unitPrice) * componentMultiplier * bundleMultiplier * rate * scale);
  return Number.isSafeInteger(minor) ? (minor / scale).toFixed(decimals) : null;
}

function currencyDecimals(currencyCode) {
  if (typeof currencyCode !== "string" || !/^[A-Z]{3,4}$/.test(currencyCode)) return null;
  if (ZERO_DECIMAL.has(currencyCode)) return 0;
  return THREE_DECIMAL.has(currencyCode) ? 3 : 2;
}
