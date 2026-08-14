import * as smartBundleDom from "../../../../extensions/smart-bundle-theme/assets/smart-bundle-dom.js";
import * as smartBundleMarkup from "../../../../extensions/smart-bundle-theme/assets/smart-bundle-markup.js";
import type { PresentationConfig } from "../bundle.types";
import { PREVIEW_SCRIPTS, PREVIEW_STYLES } from "./bundle-preview-assets";

export function previewDocument(locale: string): string {
  return [
    "<!doctype html>",
    `<html lang="${escapeAttribute(locale)}"><head><meta charset="utf-8">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>${PREVIEW_STYLES}</style></head><body><main class="sbp sbp--without-image product__info-container">`,
    '<img class="sbp__image" data-preview-image hidden alt="">',
    '<div class="sbp__details">',
    '<h1 class="sbp__title" data-preview-title></h1>',
    '<div class="sbp__price" data-product-price aria-live="polite">',
    '<s class="sbp__price-original" data-original-price hidden></s>',
    '<strong data-current-price>—</strong></div>',
    '<div data-preview-bundle></div>',
    "</div></main></body></html>",
  ].join("");
}

export function bootstrapPreviewFrame(frame: HTMLIFrameElement): boolean {
  const view = frame.contentWindow;
  const frameDocument = frame.contentDocument;
  if (!view || !frameDocument?.head) return false;
  Object.assign(view, {
    SmartBundleDom: smartBundleDom,
    SmartBundleMarkup: smartBundleMarkup,
    fetch: () => Promise.resolve(new Response("{}", { status: 200 })),
  });
  PREVIEW_SCRIPTS.forEach((source) => runScript(frameDocument, source));
  return true;
}

export function previewHost(
  frameDocument: Document,
  config: PresentationConfig,
  locale: string,
): HTMLElement {
  const host = frameDocument.createElement("smart-bundle");
  host.className = "sb";
  host.setAttribute("hidden", "");
  Object.assign(host.dataset, {
    autoMount: "false", blockId: "preview", locale,
    redirectToCart: "false", showProgress: "true",
  });
  host.append(presentationScript(frameDocument, config));
  return host;
}

export function previewNotice(frameDocument: Document, message: string): HTMLElement {
  const notice = frameDocument.createElement("p");
  notice.className = "sbp__notice";
  notice.textContent = message;
  return notice;
}

function presentationScript(
  frameDocument: Document,
  config: PresentationConfig,
): HTMLScriptElement {
  const script = frameDocument.createElement("script");
  script.type = "application/json";
  script.setAttribute("data-presentation", "");
  script.textContent = JSON.stringify(config);
  return script;
}

function runScript(frameDocument: Document, source: string): void {
  const script = frameDocument.createElement("script");
  script.type = "module";
  script.textContent = source;
  frameDocument.head.append(script);
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"]/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}
