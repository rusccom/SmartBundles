const ZERO_DECIMAL = new Set(["AFN", "ALL", "BIF", "BYR", "CLP", "DJF", "GNF", "IQD", "IRR", "ISK", "JPY", "KMF", "KRW", "LAK", "LBP", "MGA", "MMK", "PYG", "RSD", "RWF", "SLL", "SOS", "STD", "SYP", "UGX", "VND", "VUV", "XAF", "XOF", "XPF", "YER"]);
const THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export function currencyScale(currency) {
  if (typeof currency !== "string" || !/^[A-Z]{3,4}$/.test(currency)) return null;
  if (ZERO_DECIMAL.has(currency)) return 1;
  return THREE_DECIMAL.has(currency) ? 1_000 : 100;
}

export function moneyFormat(sample) {
  if (typeof sample !== "string") return null;
  const match = /^(.*?)(1\D*2\D*34)([^\d]*)(?:567|568)(?:([^\d])(89\d*))?([^\d]*)$/.exec(sample);
  if (!match) return null;
  const groupSize = /12\D+34/.test(match[2]) ? 2 : 3;
  return { prefix: match[1], group: match[3], groupSize,
    decimal: match[4] || "", digits: match[5]?.length || 0, suffix: match[6] };
}

export function formatMoney(amount, format) {
  if (!format || !Number.isFinite(amount) || amount < 0) return null;
  const [whole, fraction] = amount.toFixed(format.digits).split(".");
  const pattern = format.groupSize === 2 ? /\B(?=(\d{2})*\d{3}(?!\d))/g : /\B(?=(\d{3})+(?!\d))/g;
  const grouped = whole.replace(pattern, format.group);
  return `${format.prefix}${grouped}${fraction ? format.decimal + fraction : ""}${format.suffix}`;
}

if (typeof window !== "undefined") {
  window.SmartBundleMoney = Object.freeze({ currencyScale, moneyFormat, formatMoney });
}
