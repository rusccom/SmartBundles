import sanitizeHtml from "sanitize-html";
import { generateHTML, generateJSON } from "@tiptap/html/server";
import {
  DESCRIPTION_ALIASES,
  DESCRIPTION_ALLOWED_TAGS,
  DESCRIPTION_BLOCKED_TAGS,
  DESCRIPTION_MAX_HTML_LENGTH,
  DESCRIPTION_MAX_RAW_BYTES,
  DESCRIPTION_SCHEMES,
} from "./description-policy";
import { normalizedDescriptionHref } from "./description-url";
import { descriptionExtensions } from "./description-extensions";
import { descriptionDocumentWithinLimits } from "./description-document-limits";
import { normalizeDescriptionHtmlServer } from "./description-dom.server";
import { canonicalDescriptionStyle, descriptionStyleIsClean } from "./description-style";

export interface DescriptionSanitizeResult {
  value: string;
  error?: string;
}

const SOURCE_TAGS = new Set<string>([...DESCRIPTION_ALLOWED_TAGS, ...Object.keys(DESCRIPTION_ALIASES)]);

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...DESCRIPTION_ALLOWED_TAGS],
  allowedAttributes: { "*": ["style"], a: ["href", "title"], ol: ["start"] },
  allowedSchemes: [...DESCRIPTION_SCHEMES],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  nonTextTags: [...DESCRIPTION_BLOCKED_TAGS],
  transformTags: {
    "*": transformSafeStyle,
    a: transformLink,
    b: "strong",
    i: "em",
    del: "s",
    strike: "s",
    ol: transformOrderedList,
  },
  enforceHtmlBoundary: true,
};

export function sanitizeDescription(raw: string): DescriptionSanitizeResult {
  if (Buffer.byteLength(raw, "utf8") > DESCRIPTION_MAX_RAW_BYTES) {
    return { value: "", error: "Description HTML cannot exceed 50 KB." };
  }
  const value = canonicalDescription(raw);
  if (value === null) return { value: "", error: "Description HTML is too complex or malformed." };
  if (value.length > DESCRIPTION_MAX_HTML_LENGTH) {
    return { value: "", error: "Description HTML cannot exceed 20,000 characters after cleaning." };
  }
  return { value };
}

export function canonicalizeDescription(raw: string): string {
  const result = sanitizeDescription(raw);
  if (result.error) throw new Error(result.error);
  return result.value;
}

export function descriptionsSemanticallyEqual(left: string, right: string): boolean {
  if (!isPolicyClean(left) || !isPolicyClean(right)) return false;
  const actual = canonicalDescription(left);
  const expected = canonicalDescription(right);
  return actual !== null && expected !== null && actual === expected;
}

export function normalizeDescriptionSemantics(raw: string): string {
  return canonicalDescription(raw) ?? "";
}

function canonicalDescription(raw: string): string | null {
  try {
    const normalized = normalizeDescriptionHtmlServer(policySanitize(raw));
    const document = generateJSON(normalized, descriptionExtensions);
    if (!descriptionDocumentWithinLimits(document)) return null;
    const generated = generateHTML(document, descriptionExtensions);
    const finalHtml = normalizeDescriptionHtmlServer(policySanitize(generated));
    return finalHtml === "<p></p>" ? "" : finalHtml;
  } catch {
    return null;
  }
}

function policySanitize(raw: string): string {
  return sanitizeHtml(raw, OPTIONS).trim();
}

function transformOrderedList(tagName: string, attributes: sanitizeHtml.Attributes): sanitizeHtml.Tag {
  const start = attributes.start;
  const style = attributes.style;
  const attribs: sanitizeHtml.Attributes = {};
  if (start && /^-?\d+$/.test(start)) attribs.start = start;
  return { tagName, attribs: style ? { ...attribs, style } : attribs };
}

function transformLink(tagName: string, attributes: sanitizeHtml.Attributes): sanitizeHtml.Tag {
  const href = normalizedDescriptionHref(attributes.href ?? "");
  if (!href) return { tagName: "span", attribs: styleAttribute(attributes) };
  const title = attributes.title?.trim();
  const attribs: sanitizeHtml.Attributes = { href };
  if (title) attribs.title = title;
  return { tagName, attribs: { ...attribs, ...styleAttribute(attributes) } };
}

function transformSafeStyle(tagName: string, attributes: sanitizeHtml.Attributes): sanitizeHtml.Tag {
  const attribs = { ...attributes };
  const style = canonicalDescriptionStyle(attribs.style ?? "", tagName);
  if (style) attribs.style = style;
  else delete attribs.style;
  return { tagName, attribs };
}

function styleAttribute(attributes: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  return attributes.style ? { style: attributes.style } : {};
}

function isPolicyClean(raw: string): boolean {
  let clean = true;
  sanitizeHtml(raw, {
    ...OPTIONS,
    onOpenTag: (name, attributes) => { if (!isAllowedSourceTag(name, attributes)) clean = false; },
  });
  return clean;
}

function isAllowedSourceTag(name: string, attributes: sanitizeHtml.Attributes): boolean {
  if (!SOURCE_TAGS.has(name)) return false;
  const keys = Object.keys(attributes);
  if (!keys.length) return true;
  if (name === "a") return allowedLinkAttributes(keys, attributes) && allowedSourceStyle(name, attributes);
  if (name === "ol") return allowedOrderedListAttributes(keys, attributes);
  return keys.length === 1 && keys[0] === "style" && allowedSourceStyle(name, attributes);
}

function allowedLinkAttributes(keys: string[], attributes: sanitizeHtml.Attributes): boolean {
  if (keys.some((key) => key !== "href" && key !== "title" && key !== "style")) return false;
  return Boolean(normalizedDescriptionHref(attributes.href ?? ""));
}

function allowedOrderedListAttributes(keys: string[], attributes: sanitizeHtml.Attributes): boolean {
  if (keys.some((key) => key !== "start" && key !== "style")) return false;
  if (attributes.start && !/^-?\d+$/.test(attributes.start)) return false;
  return allowedSourceStyle("ol", attributes);
}

function allowedSourceStyle(tagName: string, attributes: sanitizeHtml.Attributes): boolean {
  return descriptionStyleIsClean(attributes.style ?? "", tagName);
}
