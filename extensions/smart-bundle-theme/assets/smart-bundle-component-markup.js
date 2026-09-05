import { attributes, element, fillTemplate, mediaBox } from "./smart-bundle-dom.js";

const SUMMARY_MEDIA = {
  className: "sb__media", imageClass: "sb__image", placeholderClass: "sb__image-placeholder",
  size: 48, wrap: true, tagImage: true,
};
const OPTION_MEDIA = {
  className: "sb__option-media", placeholderClass: "sb__option-placeholder", size: 40,
};

export function componentSection(selector, context) {
  const first = selector.options[0] ?? {};
  const simple = selector.options.length === 1;
  const summary = summaryContent(selector, first, context, initialLabel(selector, simple, context));
  const section = componentHost(selector, first);
  section.append(...(simple
    ? staticSummary(summary, first)
    : disclosure(summary, selector, context)));
  return section;
}

function componentHost(selector, first) {
  return attributes(element("section", "sb__component"), {
    "data-component": true,
    "data-selector-key": JSON.stringify(selector.key),
    "data-quantity": selector.quantity,
    "data-discount-percent": selector.discountPercent,
    "data-default-image": first.imageUrl ?? "",
  });
}

function initialLabel(selector, simple, context) {
  if (!simple) return context.texts.chooseVariant;
  return selector.options[0].available === false ? context.texts.optionUnavailable : null;
}

function summaryContent(selector, first, context, label) {
  return [
    mediaBox({ ...SUMMARY_MEDIA, url: first.imageUrl }),
    summaryCopy(selector, label),
    summaryMeta(selector, context),
  ];
}

function summaryCopy(selector, label) {
  const copy = element("span", "sb__summary-copy");
  copy.append(element("strong", "sb__product-title", selector.productTitle));
  if (label === null) return copy;
  const selection = element("span", "sb__selection", label);
  selection.setAttribute("data-selection-label", "");
  copy.append(selection);
  return copy;
}

function summaryMeta(selector, context) {
  const { texts } = context;
  const meta = element("span", "sb__summary-meta");
  meta.append(summaryQuantity(texts.quantityTemplate, selector.quantity));
  if (Number(selector.discountPercent) > 0) {
    meta.append(element("span", "sb__component-discount",
      fillTemplate(texts.discountBadgeTemplate, { discount: selector.discountPercent })));
  }
  meta.append(linePrice(context.priceMode));
  if (selector.options.length > 1) meta.append(chevron());
  return meta;
}

function summaryQuantity(template, quantity) {
  const node = element("span", "sb__quantity");
  String(template ?? "").split(/(__quantity__)/).forEach((part) => {
    node.append(part === "__quantity__"
      ? element("span", "sb__quantity-value", quantity)
      : part);
  });
  return node;
}

function linePrice(priceMode) {
  const price = element("span", "sb__line-price", priceMode === "fixed" ? "" : "—");
  price.setAttribute("data-line-price", "");
  return price;
}

function staticSummary(summary, first) {
  const box = element("div", "sb__summary sb__summary--static");
  box.append(...summary);
  return [box, staticInput(first)];
}

function staticInput(first) {
  return attributes(element("input"), {
    type: "hidden", "data-selector": true, "data-option-title": "",
    "data-image-url": first.imageUrl ?? "", "data-unit-price": first.unitPrice ?? "",
    value: first.available === false ? "" : first.id,
  });
}

function disclosure(summary, selector, context) {
  const panelId = `${context.idPrefix}-panel-${context.index}`;
  const button = attributes(element("button", "sb__summary sb__summary--button"), {
    type: "button", "data-disclosure": true,
    "aria-expanded": "false", "aria-controls": panelId,
  });
  button.append(...summary);
  return [button, optionsPanel(selector, context, panelId)];
}

function chevron() {
  const node = element("span", "sb__chevron");
  node.setAttribute("aria-hidden", "true");
  return node;
}

function optionsPanel(selector, context, panelId) {
  const panel = attributes(element("div", "sb__panel"), {
    id: panelId, "data-panel": true, hidden: true,
  });
  panel.append(optionsFieldset(selector, context));
  return panel;
}

function optionsFieldset(selector, context) {
  const fieldset = element("fieldset", "sb__options");
  fieldset.setAttribute("aria-required", "true");
  fieldset.append(element("legend", "sb__visually-hidden",
    fillTemplate(context.texts.chooseVariantForTemplate, { product: selector.productTitle })));
  selector.options.forEach((option) => fieldset.append(optionLabel(option, selector, context)));
  return fieldset;
}

function optionLabel(option, selector, context) {
  const soldOut = option.available === false;
  const label = element("label", soldOut ? "sb__option sb__option--sold-out" : "sb__option");
  label.append(
    optionInput(option, `${context.idPrefix}-${selector.key}`, soldOut),
    mediaBox({ ...OPTION_MEDIA, url: option.imageUrl }),
    optionCopy(option, soldOut, context.texts),
    optionPrice(),
  );
  return label;
}

function optionInput(option, name, soldOut) {
  return attributes(element("input", "sb__option-input"), {
    type: "radio", name, value: option.id, "data-selector": true,
    "data-option-title": option.title, "data-image-url": option.imageUrl ?? "",
    "data-unit-price": option.unitPrice ?? "", disabled: soldOut,
  });
}

function optionCopy(option, soldOut, texts) {
  const copy = element("span", "sb__option-copy");
  copy.append(element("span", undefined, option.title));
  if (soldOut) copy.append(element("small", undefined, texts.soldOut));
  return copy;
}

function optionPrice() {
  const price = element("span", "sb__option-price");
  price.setAttribute("data-option-price", "");
  return price;
}
