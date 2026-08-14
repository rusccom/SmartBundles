const { activeMinor, formatMinor, selectedInput, sourceMinor } = window.SmartBundleCore;
const price = window.SmartBundlePrice;
const PRICE_CONTAINER = '[id^="price-"], [data-product-price], .product__price';

function bundleDiscount(element) {
  return price.percentValue(element.dataset.discountPercent);
}

function componentDiscount(component) {
  return price.percentValue(component?.dataset.discountPercent);
}

function inputSourceMinor(input, context) {
  return input && context ? sourceMinor(input.dataset.unitPrice, context.sourceScale) : null;
}

function discountedActiveMinor(source, context, componentPercent, bundlePercent) {
  if (source === null || !context || componentPercent === null || bundlePercent === null) return null;
  return price.convertedMinor({
    source, sourceScale: context.sourceScale, activeScale: context.activeScale,
    rate: context.rate, componentPercent, bundlePercent,
  });
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

function productRoot(element) {
  return element.closest("product-info")
    || element.closest(".product__info-container")
    || element.parentElement;
}

function currentPrice(container) {
  const managed = container.querySelector("[data-current-price]");
  const sale = container.querySelector(".price--on-sale .price-item--sale");
  const regular = container.querySelector(".price__regular .price-item--regular");
  const generic = container.querySelector("[data-product-price], [data-price], .money");
  return managed || sale || regular || generic || fallbackContainer(container);
}

function fallbackContainer(container) {
  if (container.matches("[data-product-price], [data-price]")) return container;
  return container.matches(".product__price") && !container.children.length ? container : null;
}

function originalPrice(container) {
  return container.querySelector("[data-original-price]")
    || container.querySelector(".price--on-sale .price__sale .price-item--regular");
}

class SmartBundlePriceController {
  constructor(element) {
    this.element = element;
    this.context = window.SmartBundleCore.priceContext(element);
    const container = productRoot(element)?.querySelector(PRICE_CONTAINER);
    this.nativeCurrent = container ? currentPrice(container) : null;
    this.nativeOriginal = container ? originalPrice(container) : null;
    this.nativeCurrentText = this.nativeCurrent?.textContent;
    this.nativeOriginalText = this.nativeOriginal?.textContent;
  }

  validContract(inputs) {
    return validContract(this.element, inputs, this.context);
  }

  renderOptions() {
    this.element.querySelectorAll("[data-option-price]").forEach((output) => {
      const input = output.closest("label")?.querySelector("[data-selector]");
      output.textContent = optionText(this.element, input, this.context);
    });
  }

  renderLine(component, input) {
    component.querySelector("[data-line-price]").textContent = lineText(
      this.element, component, input, this.context);
  }

  render(components, complete) {
    const resolved = totals(this.element, components, this.context, complete);
    this.renderNative(previewTotals(this.element, components, this.context));
    return resolved;
  }

  renderNative(resolved) {
    if (this.nativeCurrent && resolved?.current) this.nativeCurrent.textContent = resolved.current;
    if (!this.nativeOriginal) return;
    if (this.nativeOriginal.matches("[data-original-price]")) {
      this.nativeOriginal.textContent = resolved?.original || "";
      this.nativeOriginal.hidden = !resolved?.original;
    } else if (resolved?.original) this.nativeOriginal.textContent = resolved.original;
  }

  destroy() {
    if (this.nativeCurrent && this.nativeCurrentText !== undefined) {
      this.nativeCurrent.textContent = this.nativeCurrentText;
    }
    if (this.nativeOriginal && this.nativeOriginalText !== undefined) {
      this.nativeOriginal.textContent = this.nativeOriginalText;
    }
  }
}

price.mount = (element) => new SmartBundlePriceController(element);
