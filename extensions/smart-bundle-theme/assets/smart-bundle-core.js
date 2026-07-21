const SMART_BUNDLE_ZERO_DECIMAL = new Set(["AFN", "ALL", "BIF", "BYR", "CLP", "DJF", "GNF", "IQD", "IRR", "ISK", "JPY", "KMF", "KRW", "LAK", "LBP", "MGA", "MMK", "PYG", "RSD", "RWF", "SLL", "SOS", "STD", "SYP", "UGX", "VND", "VUV", "XAF", "XOF", "XPF", "YER"]);
const SMART_BUNDLE_THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "LYD", "OMR", "TND"]);

window.SmartBundleCore = Object.freeze({
  fillTemplate(template, values) {
    return Object.entries(values).reduce((text, [key, value]) => text.replace(`__${key}__`, value), template);
  },
  selectedInput(component) {
    const hidden = component.querySelector('input[type="hidden"][data-selector]');
    return hidden?.value ? hidden : component.querySelector('input[type="radio"][data-selector]:checked');
  },
  validQuantity(component) {
    const quantity = Number(component.dataset.quantity);
    return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 2000;
  },
  currencyScale(currency) {
    if (!/^[A-Z]{3,4}$/.test(currency)) return null;
    if (SMART_BUNDLE_ZERO_DECIMAL.has(currency)) return 1;
    return SMART_BUNDLE_THREE_DECIMAL.has(currency) ? 1_000 : 100;
  },
  priceContext(element) {
    const source = element.dataset.currencyCode || "";
    const active = window.Shopify?.currency?.active || source;
    const scale = window.SmartBundleCore.currencyScale;
    const sourceScale = scale(source);
    const activeScale = scale(active);
    const rate = source === active ? 1 : Number(window.Shopify?.currency?.rate);
    if (!sourceScale || !activeScale || !Number.isFinite(rate) || rate <= 0) return null;
    return { source, active, sourceScale, activeScale, rate };
  },
  sourceMinor(value, scale) {
    const text = String(value ?? "").trim();
    if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
    const minor = Math.round(Number(text) * scale);
    return Number.isSafeInteger(minor) ? minor : null;
  },
  activeMinor(minor, context) {
    if (minor === null || !context) return null;
    const converted = Math.round(minor / context.sourceScale * context.rate * context.activeScale);
    return Number.isSafeInteger(converted) ? converted : null;
  },
  formatMinor(minor, context) {
    if (minor === null || !context) return null;
    try {
      const options = { style: "currency", currency: context.active };
      return new Intl.NumberFormat(document.documentElement.lang || undefined, options).format(minor / context.activeScale);
    } catch { return `${(minor / context.activeScale).toFixed(Math.log10(context.activeScale))} ${context.active}`; }
  },
});
