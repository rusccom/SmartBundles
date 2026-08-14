/* global BigInt */

const PRICE_SCALE = 100n;
const PERCENT_SCALE = 10_000n;
const DISCOUNT_DENOMINATOR = PERCENT_SCALE * PERCENT_SCALE;
const MAX_PRICE_MINOR = 999_999_999_999n;

function calculate(input) {
  const original = priceBounds(input, "0", false);
  const final = priceBounds(input, input.discountPercent, true);
  assertBounds(original);
  assertBounds(final);
  return {
    originalPrice: moneyText(original.minimum),
    finalPrice: moneyText(final.minimum),
    maximumOriginalPrice: moneyText(original.maximum),
    maximumFinalPrice: moneyText(final.maximum),
  };
}

function priceBounds(input, bundlePercent, componentDiscounts) {
  if (input.pricingMode === "FIXED") return fixedBounds(input.fixedPrice, bundlePercent);
  if (input.pricingMode !== "DYNAMIC") throw new Error("Pricing mode is invalid.");
  return dynamicBounds(input.selectors, bundlePercent, componentDiscounts);
}

function fixedBounds(value, bundlePercent) {
  const minor = discountedMoney(value, "0", bundlePercent);
  return { minimum: minor, maximum: minor };
}

function dynamicBounds(selectors, bundlePercent, componentDiscounts) {
  return selectors.reduce((total, selector) => {
    const bounds = selectorBounds(selector, bundlePercent, componentDiscounts);
    const quantity = requiredQuantity(selector.quantity);
    return {
      minimum: total.minimum + bounds.minimum * quantity,
      maximum: total.maximum + bounds.maximum * quantity,
    };
  }, { minimum: 0n, maximum: 0n });
}

function selectorBounds(selector, bundlePercent, componentDiscounts) {
  const componentPercent = componentDiscounts ? selector.discountPercent : "0";
  const prices = selector.options.map((option) =>
    discountedMoney(option.unitPrice, componentPercent, bundlePercent));
  if (!prices.length) throw new Error("Dynamic bundle has no options.");
  return {
    minimum: prices.reduce((lowest, price) => price < lowest ? price : lowest),
    maximum: prices.reduce((highest, price) => price > highest ? price : highest),
  };
}

function discountedMoney(value, componentPercent, bundlePercent) {
  const minor = moneyMinor(value);
  if (minor === null) throw new Error("Bundle price is invalid.");
  return discountedBigInt(minor, componentPercent, bundlePercent);
}

function discountedMinor(source, componentPercent, bundlePercent) {
  if (!Number.isSafeInteger(source) || source < 0) return null;
  const result = discountedBigInt(BigInt(source), componentPercent, bundlePercent);
  return safeNumber(result);
}

function discountedBigInt(source, componentPercent, bundlePercent) {
  const component = requiredPercent(componentPercent);
  const bundle = requiredPercent(bundlePercent);
  const numerator = source * (PERCENT_SCALE - component) * (PERCENT_SCALE - bundle);
  return roundedDivision(numerator, DISCOUNT_DENOMINATOR);
}

function convertedMinor(input) {
  const component = percentValue(input.componentPercent);
  const bundle = percentValue(input.bundlePercent);
  if (!validConversion(input) || component === null || bundle === null) return null;
  const sourceAmount = input.source / input.sourceScale;
  const converted = sourceAmount * input.rate * input.activeScale;
  const discounted = converted * (100 - component) / 100 * (100 - bundle) / 100;
  const minor = Math.round(discounted);
  return Number.isSafeInteger(minor) ? minor : null;
}

function validConversion(input) {
  return Number.isSafeInteger(input.source) && input.source >= 0
    && Number.isSafeInteger(input.sourceScale) && input.sourceScale > 0
    && Number.isSafeInteger(input.activeScale) && input.activeScale > 0
    && Number.isFinite(input.rate) && input.rate > 0;
}

function moneyMinor(value) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const fraction = `${match[2] || ""}000`;
  let minor = BigInt(match[1]) * PRICE_SCALE + BigInt(fraction.slice(0, 2));
  if (Number(fraction[2]) >= 5) minor += 1n;
  return minor;
}

function moneyText(minor) {
  const whole = minor / PRICE_SCALE;
  const fraction = String(minor % PRICE_SCALE).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function percentBasis(value) {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const basis = BigInt(match[1]) * 100n
    + BigInt(`${match[2] || ""}00`.slice(0, 2));
  return basis <= PERCENT_SCALE ? basis : null;
}

function percentValue(value) {
  const basis = percentBasis(value);
  return basis === null ? null : Number(basis) / 100;
}

function requiredPercent(value) {
  const basis = percentBasis(value);
  if (basis === null) throw new Error("Discount is out of range.");
  return basis;
}

function requiredQuantity(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Quantity is invalid.");
  return BigInt(value);
}

function roundedDivision(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function assertBounds(bounds) {
  if (bounds.minimum < 0n || bounds.maximum > MAX_PRICE_MINOR) {
    throw new Error("Bundle parent price is outside the supported range.");
  }
}

function compareAt(prices) {
  return prices.originalPrice === prices.finalPrice ? null : prices.originalPrice;
}

export const SmartBundlePrice = {
  calculate, compareAt, convertedMinor, discountedMinor, percentValue,
};

export default SmartBundlePrice;

if (typeof window !== "undefined") window.SmartBundlePrice = SmartBundlePrice;
