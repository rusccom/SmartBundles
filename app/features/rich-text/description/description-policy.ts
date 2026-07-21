export const DESCRIPTION_MAX_RAW_BYTES = 50 * 1024;
export const DESCRIPTION_MAX_HTML_LENGTH = 20_000;

export const DESCRIPTION_ALLOWED_TAGS = [
  "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
  "strong", "em", "u", "s", "a", "ul", "ol", "li", "section", "div", "span",
] as const;

export const DESCRIPTION_BLOCKED_TAGS = [
  "script", "style", "iframe", "object", "embed", "form", "input", "textarea",
  "select", "option", "button", "svg", "math",
] as const;

export const DESCRIPTION_ALIASES = {
  b: "strong",
  i: "em",
  del: "s",
  strike: "s",
} as const;

export const DESCRIPTION_SCHEMES = ["http", "https", "mailto", "tel"] as const;
