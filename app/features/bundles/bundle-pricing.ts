import { Prisma } from "@prisma/client";
import type {
  BundlePricingMode,
  BundleSelectorInput,
} from "./bundle.types";

const MAX_PARENT_PRICE = new Prisma.Decimal("9999999999.99");

export function pricingModeCode(mode: BundlePricingMode): 0 | 1 {
  return mode === "DYNAMIC" ? 1 : 0;
}

export function calculateParentPrice(
  mode: BundlePricingMode,
  fixedPrice: string | null,
  selectors: BundleSelectorInput[],
): string {
  const price = mode === "FIXED" ? requiredFixedPrice(fixedPrice) : dynamicPrice(selectors);
  if (price.greaterThan(MAX_PARENT_PRICE)) throw new Error("Bundle parent price is too large.");
  return price.toFixed(2);
}

function requiredFixedPrice(value: string | null): Prisma.Decimal {
  if (!value) throw new Error("Fixed bundle price is required.");
  return new Prisma.Decimal(value);
}

function dynamicPrice(selectors: BundleSelectorInput[]): Prisma.Decimal {
  return selectors.reduce((total, selector) => {
    const maximum = selector.options.reduce(maximumOptionPrice, new Prisma.Decimal(-1));
    if (maximum.isNegative()) throw new Error("Dynamic bundle option price is missing.");
    return total.plus(maximum.times(selector.quantity));
  }, new Prisma.Decimal(0));
}

function maximumOptionPrice(maximum: Prisma.Decimal, option: BundleSelectorInput["options"][number]) {
  if (option.unitPrice === undefined) throw new Error("Dynamic bundle option price is missing.");
  return Prisma.Decimal.max(maximum, new Prisma.Decimal(option.unitPrice));
}
