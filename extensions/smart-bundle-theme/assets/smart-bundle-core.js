const { currencyScale, moneyFormat, formatMoney } = window.SmartBundleMoney;

window.SmartBundleCore = Object.freeze({
  selectedInput(component) {
    const hidden = component.querySelector('input[type="hidden"][data-selector]');
    return hidden?.value ? hidden : component.querySelector('input[type="radio"][data-selector]:checked');
  },
  validQuantity(component) {
    const quantity = Number(component.dataset.quantity);
    return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 2000;
  },
  priceContext(element) {
    const currency = element.dataset.currencyCode;
    const scale = currencyScale(currency);
    const sample = document.createElement("textarea");
    sample.innerHTML = element.dataset.moneySample || "";
    const format = moneyFormat(sample.value);
    return scale && format ? { currency, scale, format } : null;
  },
  sourceMinor(value, scale) {
    const text = String(value ?? "").trim();
    if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
    const minor = Math.round(Number(text) * scale);
    return Number.isSafeInteger(minor) ? minor : null;
  },
  formatMinor(minor, context) {
    if (minor === null || !context) return null;
    return formatMoney(minor / context.scale, context.format);
  },
});
