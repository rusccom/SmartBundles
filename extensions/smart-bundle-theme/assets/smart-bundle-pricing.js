const { activeMinor, formatMinor, selectedInput, sourceMinor } = window.SmartBundleCore;

function percentValue(value) {
  value = String(value ?? "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return null;
  const percent = Number(value);
  return percent >= 0 && percent <= 100 ? percent : null;
}

function bundleDiscount(element) {
  return percentValue(element.dataset.discountPercent);
}

function componentDiscount(component) {
  return percentValue(component?.dataset.discountPercent);
}

function inputSourceMinor(input, context) {
  return input && context ? sourceMinor(input.dataset.unitPrice, context.sourceScale) : null;
}

function discountedActiveMinor(source, context, componentPercent, bundlePercent) {
  if (source === null || !context || componentPercent === null || bundlePercent === null) return null;
  const amount = source / context.sourceScale;
  const component = (100 - componentPercent) / 100;
  const bundle = (100 - bundlePercent) / 100;
  const converted = amount * component * bundle * context.rate * context.activeScale;
  const minor = Math.round(converted);
  return Number.isSafeInteger(minor) ? minor : null;
}

function validContract(element, inputs, context) {
  const components = [...element.querySelectorAll("[data-component]")];
  if (bundleDiscount(element) === null || components.some((item) => componentDiscount(item) === null)) return false;
  if (!context) return false;
  if (element.dataset.priceMode === "fixed") return validFixedContract(element, context);
  if (element.dataset.priceMode !== "dynamic") return false;
  const original = sourceMinor(element.dataset.maximumOriginalAmount, context.sourceScale);
  const final = sourceMinor(element.dataset.maximumAmount, context.sourceScale);
  return original !== null && final !== null
    && inputs.every((input) => inputSourceMinor(input, context) !== null);
}

function validFixedContract(element, context) {
  const original = sourceMinor(element.dataset.originalAmount, context.sourceScale);
  const final = sourceMinor(element.dataset.amount, context.sourceScale);
  return original !== null && final !== null;
}

function optionText(element, input, context) {
  if (element.dataset.priceMode === "fixed") return "";
  const component = input?.closest("[data-component]");
  const current = discountedActiveMinor(
    inputSourceMinor(input, context), context, componentDiscount(component), bundleDiscount(element));
  return formatMinor(current, context) || element.dataset.priceUnavailable;
}

function lineText(element, component, input, context) {
  if (element.dataset.priceMode === "fixed") return "";
  if (!input || !context) return "—";
  const unit = discountedActiveMinor(
    inputSourceMinor(input, context), context, componentDiscount(component), bundleDiscount(element));
  const total = unit === null ? null : unit * Number(component.dataset.quantity);
  return formatMinor(Number.isSafeInteger(total) ? total : null, context)
    || element.dataset.priceUnavailable;
}

function totals(element, components, context, complete) {
  if (element.dataset.priceMode === "fixed") return fixedTotals(element, context);
  if (!complete) return { current: "—", original: null };
  return dynamicTotals(element, components, context);
}

function previewTotals(element, components, context) {
  if (element.dataset.priceMode === "fixed") return fixedTotals(element, context);
  return resolvedDynamicTotals(element, components, context, previewInput);
}

function fixedTotals(element, context) {
  const percent = bundleDiscount(element);
  const original = fixedAmount(element.dataset.originalAmount, context);
  const current = fixedAmount(element.dataset.amount, context);
  return { current, original: percent ? original : null, globalDiscount: Boolean(percent) };
}

function fixedAmount(value, context) {
  const source = context ? sourceMinor(value, context.sourceScale) : null;
  return formatMinor(activeMinor(source, context), context);
}

function dynamicTotals(element, components, context) {
  return resolvedDynamicTotals(element, components, context, selectedInput);
}

function resolvedDynamicTotals(element, components, context, resolveInput) {
  const globalPercent = bundleDiscount(element);
  if (globalPercent === null || !context) return null;
  const values = { source: 0, original: 0, current: 0 };
  let discounted = globalPercent > 0;
  for (const component of components) {
    const source = inputSourceMinor(resolveInput(component, context), context);
    if (source === null) return null;
    const itemPercent = componentDiscount(component);
    const current = discountedActiveMinor(source, context, itemPercent, globalPercent);
    const original = activeMinor(source, context);
    if (current === null || original === null) return null;
    discounted ||= itemPercent > 0;
    const quantity = Number(component.dataset.quantity);
    values.source += source * quantity;
    values.original += original * quantity;
    values.current += current * quantity;
  }
  return dynamicTotalResult(element, context, discounted, globalPercent > 0, values);
}

function previewInput(component, context) {
  const selected = selectedInput(component);
  if (selected) return selected;
  const inputs = [...component.querySelectorAll('[data-selector]:not(:disabled)')]
    .filter((input) => input.value && inputSourceMinor(input, context) !== null);
  return inputs.reduce((lowest, input) => lowerPriceInput(lowest, input, context), null);
}

function lowerPriceInput(lowest, input, context) {
  if (!lowest) return input;
  return inputSourceMinor(input, context) < inputSourceMinor(lowest, context) ? input : lowest;
}

function dynamicTotalResult(element, context, discounted, globalDiscount, values) {
  const maximum = sourceMinor(element.dataset.maximumOriginalAmount, context.sourceScale);
  if (maximum === null || values.source > maximum) return null;
  if (!Number.isSafeInteger(values.original) || !Number.isSafeInteger(values.current)) return null;
  return {
    current: formatMinor(values.current, context),
    original: discounted ? formatMinor(values.original, context) : null,
    globalDiscount,
  };
}

window.SmartBundlePricing = Object.freeze({ lineText, optionText, previewTotals, totals, validContract });
