import { componentSection } from "./smart-bundle-component-markup.js";
import { attributes, element } from "./smart-bundle-dom.js";
import { resolveCatalog } from "./smart-bundle-catalog.js";

const MIN_SELECTORS = 1;
const MAX_SELECTORS = 150;

export function hydrateHost(host) {
  const config = hostPresentation(host);
  const markup = bundleMarkup(config, hostSettings(host));
  if (markup.status !== "ready") {
    host.dataset.parentVariantId = host.dataset.themeVariantId || "";
    host.replaceChildren(unavailableNote(config));
    return markup.status;
  }
  Object.assign(host.dataset, markup.dataset);
  host.replaceChildren(markup.fragment);
  return markup.status;
}

export function bundleMarkup(config, settings) {
  if (!ready(config)) return { status: "unavailable" };
  const context = {
    texts: config.texts, priceMode: config.pricing.mode, idPrefix: settings.idPrefix,
  };
  const fragment = document.createDocumentFragment();
  fragment.append(componentList(config, context), actions(config));
  return { status: "ready", dataset: bundleDataset(config), fragment };
}

export function unavailableNote(config) {
  const note = element("p", "sb__editor-note", config?.texts?.bundleUnavailable ?? "");
  note.setAttribute("role", "status");
  return note;
}

function hostPresentation(host) {
  try {
    const config = JSON.parse(host.querySelector("script[data-presentation]")?.textContent || "null");
    return resolveCatalog(config) || { texts: config?.texts };
  } catch {
    return null;
  }
}

function hostSettings(host) {
  return { idPrefix: `sb-${host.dataset.blockId || "block"}` };
}

function ready(config) {
  if (!config || config.sv !== 5 || config.en !== 1) return false;
  if (!config.texts || !config.parentVariantId) return false;
  const count = config.selectors?.length ?? 0;
  if (count < MIN_SELECTORS || count > MAX_SELECTORS) return false;
  return validPricing(config.pricing);
}

function validPricing(pricing) {
  if (!pricing || !present(pricing.discountPercent)) return false;
  if (pricing.mode === "fixed") {
    return present(pricing.originalAmount) && present(pricing.amount);
  }
  return pricing.mode === "dynamic";
}

function present(value) {
  return value !== undefined && value !== null && String(value) !== "";
}

function bundleDataset(config) {
  const { pricing } = config;
  return {
    parentVariantGid: config.parentVariantId,
    bundleId: config.b,
    moneySample: config.moneySample,
    parentVariantId: String(config.parentVariantId).split("/").pop(),
    priceMode: pricing.mode,
    currencyCode: pricing.currencyCode,
    discountPercent: pricing.discountPercent,
    originalAmount: pricing.originalAmount ?? "",
    amount: pricing.amount ?? "",
    ...textDataset(config.texts),
  };
}

function textDataset(texts) {
  return {
    progressTemplate: texts.progressTemplate,
    selectOne: texts.selectOneMore,
    selectMany: texts.selectManyMoreTemplate,
    chooseVariant: texts.chooseVariant,
    priceUnavailable: texts.priceUnavailable,
    optionUnavailable: texts.optionUnavailable,
    bundleUnavailable: texts.bundleUnavailable,
    addingLabel: texts.addingLabel,
    addedLabel: texts.addedLabel,
    addedStatus: texts.addedStatus,
    addError: texts.addError,
    addLabel: texts.buttonLabel,
  };
}

function componentList(config, context) {
  const list = element("div", "sb__components");
  list.setAttribute("data-components", "");
  config.selectors.forEach((selector, index) =>
    list.append(componentSection(selector, { ...context, index })));
  return list;
}

function actions(config) {
  const { texts } = config;
  const box = element("div", "sb__actions");
  box.append(
    message("sb__hint", "data-hint"), message("sb__status", "data-status"),
    errorMessage(), addButton(texts),
  );
  return box;
}

function message(className, flag) {
  return attributes(element("p", className), { [flag]: true, "aria-live": "polite" });
}

function errorMessage() {
  return attributes(element("p", "sb__error"), {
    "data-error": true, role: "alert", hidden: true,
  });
}

function addButton(texts) {
  return attributes(element("button", "sb__button", texts.buttonLabel), {
    type: "button", "data-add-button": true, disabled: true, "aria-disabled": "true",
  });
}

if (typeof window !== "undefined") {
  window.SmartBundleMarkup = Object.freeze({ bundleMarkup, hydrateHost, unavailableNote });
}
