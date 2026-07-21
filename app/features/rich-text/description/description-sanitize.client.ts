import {
  DESCRIPTION_ALIASES,
  DESCRIPTION_ALLOWED_TAGS,
  DESCRIPTION_BLOCKED_TAGS,
} from "./description-policy";
import { normalizeDescriptionDom } from "./description-dom";
import { canonicalDescriptionStyle } from "./description-style";
import { normalizedDescriptionHref } from "./description-url";

const ALLOWED = new Set<string>(DESCRIPTION_ALLOWED_TAGS);
const BLOCKED = DESCRIPTION_BLOCKED_TAGS.join(",");

export function sanitizeDescriptionClient(raw: string): string {
  const document = new DOMParser().parseFromString(raw, "text/html");
  document.body.querySelectorAll(BLOCKED).forEach((node) => node.remove());
  replaceAliases(document);
  Array.from(document.body.querySelectorAll("*")).forEach(cleanElement);
  return normalizeDescriptionDom(document.body);
}

function replaceAliases(document: Document): void {
  Object.entries(DESCRIPTION_ALIASES).forEach(([source, target]) => {
    document.body.querySelectorAll(source).forEach((node) => replaceTag(document, node, target));
  });
}

function replaceTag(document: Document, source: Element, target: string): void {
  const replacement = document.createElement(target);
  Array.from(source.attributes).forEach(({ name, value }) => replacement.setAttribute(name, value));
  replacement.append(...Array.from(source.childNodes));
  source.replaceWith(replacement);
}

function cleanElement(element: Element): void {
  const tag = element.tagName.toLowerCase();
  if (!ALLOWED.has(tag)) {
    element.replaceWith(...Array.from(element.childNodes));
    return;
  }
  if (tag === "a" && !normalizedDescriptionHref(element.getAttribute("href") ?? "")) {
    replaceInvalidLink(element);
    return;
  }
  const attributes = allowedAttributes(element, tag);
  Array.from(element.attributes).forEach(({ name }) => element.removeAttribute(name));
  attributes.forEach(([name, value]) => element.setAttribute(name, value));
}

function replaceInvalidLink(element: Element): void {
  const replacement = element.ownerDocument.createElement("span");
  const style = canonicalDescriptionStyle(element.getAttribute("style") ?? "", "a");
  if (style) replacement.setAttribute("style", style);
  replacement.append(...Array.from(element.childNodes));
  element.replaceWith(replacement);
}

function allowedAttributes(element: Element, tag: string): Array<[string, string]> {
  const attributes = tag === "a" ? linkAttributes(element) : orderedListAttributes(element, tag);
  const style = canonicalDescriptionStyle(element.getAttribute("style") ?? "", tag);
  if (style) attributes.push(["style", style]);
  return attributes;
}

function orderedListAttributes(element: Element, tag: string): Array<[string, string]> {
  const start = tag === "ol" ? element.getAttribute("start") : null;
  return start && /^-?\d+$/.test(start) ? [["start", start]] : [];
}

function linkAttributes(element: Element): Array<[string, string]> {
  const attributes: Array<[string, string]> = [];
  const href = normalizedDescriptionHref(element.getAttribute("href") ?? "");
  const title = element.getAttribute("title")?.trim();
  if (href) attributes.push(["href", href]);
  if (title) attributes.push(["title", title]);
  return attributes;
}
