import { attributes, element, fillTemplate, mediaBox } from "./smart-bundle-dom.js";

const SUMMARY_MEDIA = {
  className: "sb__media", imageClass: "sb__image", placeholderClass: "sb__image-placeholder",
  size: 48, wrap: true, tagImage: true,
};
const OPTION_MEDIA = {
  className: "sb__option-media", placeholderClass: "sb__option-placeholder", size: 160,
};

export function componentSection(selector, context) {
  const first = selector.options[0] ?? { available: false };
  const simple = selector.options.length <= 1;
  const summary = summaryContent(selector, first, context, initialLabel(selector, simple, context));
  const section = componentHost(selector, first);
  if (!selector.options.length) section.dataset.unavailable = "true";
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
  if (!selector.options.length) return context.texts.optionUnavailable;
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
  meta.append(linePrice(context.priceMode));
  if (selector.quantity > 1) {
    meta.append(element("span", "sb__quantity", fillTemplate(texts.quantityTemplate, { quantity: selector.quantity })));
  }
  if (Number(selector.discountPercent) > 0) {
    meta.append(element("span", "sb__component-discount",
      fillTemplate(texts.discountBadgeTemplate, { discount: selector.discountPercent })));
  }
  return meta;
}

function linePrice(priceMode) {
  const price = element("span", "sb__line-price", priceMode === "fixed" ? "" : "—");
  price.setAttribute("data-line-price", "");
  return price;
}

function staticSummary(summary, first) {
  const box = element("div", "sb__summary");
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
  button.append(...summary, chevron());
  return [button, optionsPanel(selector, context, panelId)];
}

function chevron() {
  const namespace = "http://www.w3.org/2000/svg";
  const node = attributes(document.createElementNS(namespace, "svg"), {
    class: "sb__chevron", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false",
  });
  node.append(attributes(document.createElementNS(namespace, "path"), {
    d: "M6 9l6 6 6-6", fill: "none", stroke: "currentColor",
    "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round",
  }));
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
  selector.options.forEach((option) => fieldset.append(optionTile(option, selector, context)));
  return fieldset;
}

function optionTile(option, selector, context) {
  const soldOut = option.available === false;
  const tile = element("label", soldOut ? "sb__option sb__option--sold-out" : "sb__option");
  tile.append(
    optionInput(option, `${context.idPrefix}-${selector.key}`, soldOut),
    mediaBox({ ...OPTION_MEDIA, url: option.imageUrl }),
    element("span", "sb__option-title", option.title),
    optionPrice(),
  );
  if (soldOut) tile.append(element("span", "sb__option-badge", context.texts.soldOut));
  return tile;
}

function optionInput(option, name, soldOut) {
  return attributes(element("input", "sb__option-input"), {
    type: "radio", name, value: option.id, "data-selector": true,
    "data-option-title": option.title, "data-image-url": option.imageUrl ?? "",
    "data-unit-price": option.unitPrice ?? "", disabled: soldOut,
  });
}

function optionPrice() {
  const price = element("span", "sb__option-price");
  price.setAttribute("data-option-price", "");
  return price;
}
