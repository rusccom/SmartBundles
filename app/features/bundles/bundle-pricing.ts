import { Prisma } from "@prisma/client";
import type { BundleDraftInput, BundlePricingMode, BundleSelectorInput } from "./bundle.types";

const MAX_PARENT_PRICE = new Prisma.Decimal("9999999999.99");
const HUNDRED = new Prisma.Decimal(100);

export interface BundlePrices {
  originalPrice: string;
  finalPrice: string;
  maximumOriginalPrice: string;
  maximumFinalPrice: string;
}

interface PriceBounds {
  minimum: Prisma.Decimal;
  maximum: Prisma.Decimal;
}

export function pricingModeCode(mode: BundlePricingMode): 0 | 1 {
  return mode === "DYNAMIC" ? 1 : 0;
}

export function calculateBundlePrices(input: BundleDraftInput): BundlePrices {
  const original = bundlePriceBounds(input, new Prisma.Decimal(0), false);
  const final = bundlePriceBounds(input, discount(input.discountPercent), true);
  assertSupportedBounds(original);
  assertSupportedBounds(final);
  return {
    originalPrice: original.minimum.toFixed(2),
    finalPrice: final.minimum.toFixed(2),
    maximumOriginalPrice: original.maximum.toFixed(2),
    maximumFinalPrice: final.maximum.toFixed(2),
  };
}

export function bundleCompareAtPrice(prices: BundlePrices): string | null {
  return prices.originalPrice === prices.finalPrice ? null : prices.originalPrice;
}

function bundlePriceBounds(
  input: BundleDraftInput,
  bundlePercent: Prisma.Decimal,
  includeComponentDiscount: boolean,
): PriceBounds {
  if (input.pricingMode === "FIXED") {
    return fixedPriceBounds(input.fixedPrice, bundlePercent);
  }
  return dynamicPriceBounds(input.selectors, bundlePercent, includeComponentDiscount);
}

function fixedPriceBounds(value: string | null, percent: Prisma.Decimal): PriceBounds {
  const price = discountedPrice(requiredFixedPrice(value), percent);
  return { minimum: price, maximum: price };
}

function requiredFixedPrice(value: string | null): Prisma.Decimal {
  if (!value) throw new Error("Fixed bundle price is required.");
  return new Prisma.Decimal(value);
}

function dynamicPriceBounds(
  selectors: BundleSelectorInput[],
  bundlePercent: Prisma.Decimal,
  includeComponentDiscount: boolean,
): PriceBounds {
  return selectors.reduce((total, selector) => {
    const bounds = selectorPriceBounds(selector, bundlePercent, includeComponentDiscount);
    return {
      minimum: total.minimum.plus(bounds.minimum.times(selector.quantity)),
      maximum: total.maximum.plus(bounds.maximum.times(selector.quantity)),
    };
  }, zeroBounds());
}

function selectorPriceBounds(
  selector: BundleSelectorInput,
  bundlePercent: Prisma.Decimal,
  includeComponentDiscount: boolean,
): PriceBounds {
  const componentPercent = includeComponentDiscount ? discount(selector.discountPercent) : new Prisma.Decimal(0);
  const prices = selector.options.map((option) => optionPrice(option, componentPercent, bundlePercent));
  if (!prices.length) throw new Error("Dynamic bundle has no options.");
  return { minimum: Prisma.Decimal.min(...prices), maximum: Prisma.Decimal.max(...prices) };
}

function optionPrice(
  option: BundleSelectorInput["options"][number],
  componentPercent: Prisma.Decimal,
  bundlePercent: Prisma.Decimal,
) {
  if (option.unitPrice === undefined) throw new Error("Dynamic bundle option price is missing.");
  return discountedPrice(new Prisma.Decimal(option.unitPrice), componentPercent, bundlePercent);
}

function zeroBounds(): PriceBounds {
  return { minimum: new Prisma.Decimal(0), maximum: new Prisma.Decimal(0) };
}

function discountedPrice(
  price: Prisma.Decimal,
  componentPercent: Prisma.Decimal,
  bundlePercent = new Prisma.Decimal(0),
): Prisma.Decimal {
  const component = HUNDRED.minus(componentPercent).dividedBy(HUNDRED);
  const bundle = HUNDRED.minus(bundlePercent).dividedBy(HUNDRED);
  return price.times(component).times(bundle).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function discount(value: string): Prisma.Decimal {
  const percent = new Prisma.Decimal(value);
  if (percent.isNegative() || percent.greaterThan(HUNDRED)) throw new Error("Discount is out of range.");
  return percent;
}

function assertSupportedPrice(price: Prisma.Decimal): void {
  if (price.isNegative() || price.greaterThan(MAX_PARENT_PRICE)) {
    throw new Error("Bundle parent price is outside the supported range.");
  }
}

function assertSupportedBounds(bounds: PriceBounds): void {
  assertSupportedPrice(bounds.minimum);
  assertSupportedPrice(bounds.maximum);
}
