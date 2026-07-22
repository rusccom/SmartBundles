import type { EditorOption } from "./editor.types";

export function formatEditorPrice(price: string | undefined, currencyCode: string, locale: string): string {
  if (!price) return "—";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return price;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency", currency: currencyCode, currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

export function formatEditorLinePrice(
  price: string | undefined, quantity: number, currencyCode: string, locale: string, discountPercent: string,
): string {
  const amount = discountedAmount(price, discountPercent);
  return Number.isFinite(amount) ? formatEditorPrice(String(amount * quantity), currencyCode, locale) : "—";
}

export function formatEditorPriceRange(
  options: EditorOption[], quantity: number, currencyCode: string, locale: string, discountPercent: string,
): string {
  const prices = options.flatMap(({ unitPrice }) => numericPrice(unitPrice, discountPercent))
    .map((price) => price * quantity);
  if (!prices.length) return "—";
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  if (minimum === maximum) return formatEditorPrice(String(minimum), currencyCode, locale);
  return `${formatEditorPrice(String(minimum), currencyCode, locale)} – ${formatEditorPrice(String(maximum), currencyCode, locale)}`;
}

function numericPrice(price: string | undefined, discountPercent: string): number[] {
  const value = discountedAmount(price, discountPercent);
  return price && Number.isFinite(value) ? [value] : [];
}

function discountedAmount(price: string | undefined, discountPercent: string): number {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(discountPercent)) return Number.NaN;
  const percent = Number(discountPercent);
  const amount = Number(price);
  if (!Number.isFinite(amount) || percent < 0 || percent > 100) return Number.NaN;
  return Math.round(amount * (100 - percent)) / 100;
}
