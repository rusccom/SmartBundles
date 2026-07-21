import {
  DESCRIPTION_ALIASES,
  DESCRIPTION_ALLOWED_TAGS,
} from "./description-policy";
import { descriptionStyleIsClean } from "./description-style";
import { normalizedDescriptionHref } from "./description-url";

const ALLOWED = new Set<string>(DESCRIPTION_ALLOWED_TAGS);
const ALIASES = new Map<string, string>(Object.entries(DESCRIPTION_ALIASES));

export function descriptionSourceSupportsVisual(raw: string): boolean {
  const document = new DOMParser().parseFromString(raw, "text/html");
  return Array.from(document.body.querySelectorAll("*")).every(elementSupportsVisual);
}

function elementSupportsVisual(element: Element): boolean {
  const source = element.tagName.toLowerCase();
  const tag = ALIASES.get(source) ?? source;
  if (!ALLOWED.has(tag)) return false;
  const attributes = Array.from(element.attributes).map(({ name }) => name);
  if (!attributesSupported(element, tag, attributes)) return false;
  return descriptionStyleIsClean(element.getAttribute("style") ?? "", tag);
}

function attributesSupported(
  element: Element,
  tag: string,
  attributes: string[],
): boolean {
  if (tag === "a") return linkAttributesSupported(element, attributes);
  if (tag === "ol") return orderedListAttributesSupported(element, attributes);
  return attributes.every((name) => name === "style");
}

function linkAttributesSupported(element: Element, attributes: string[]): boolean {
  if (attributes.some((name) => !["href", "title", "style"].includes(name))) return false;
  return Boolean(normalizedDescriptionHref(element.getAttribute("href") ?? ""));
}

function orderedListAttributesSupported(element: Element, attributes: string[]): boolean {
  if (attributes.some((name) => !["start", "style"].includes(name))) return false;
  const start = element.getAttribute("start");
  return !start || /^-?\d+$/.test(start);
}
