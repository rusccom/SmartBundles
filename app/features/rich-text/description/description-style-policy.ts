export const DESCRIPTION_STYLE_PROPERTIES = new Set([
  "color", "font-family", "font-size", "font-style", "font-weight", "line-height",
  "letter-spacing", "text-align", "text-decoration", "text-transform",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "background", "background-color", "border", "border-top", "border-right",
  "border-bottom", "border-left", "border-color", "border-style", "border-width",
  "border-radius", "border-top-left-radius", "border-top-right-radius",
  "border-bottom-right-radius", "border-bottom-left-radius", "display", "box-sizing",
  "width", "height", "min-width", "max-width", "min-height", "max-height", "gap",
  "row-gap", "column-gap", "flex", "flex-basis", "flex-direction", "flex-grow",
  "flex-shrink", "flex-wrap", "justify-content", "align-items", "align-content",
  "grid-template-columns",
]);

export const DESCRIPTION_LAYOUT_TAGS = new Set(["div", "section"]);
export const DESCRIPTION_SIZED_TAGS = new Set(["div", "section", "span"]);

export const DESCRIPTION_COLOR_FUNCTIONS = new Set([
  "rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color",
]);

export const DESCRIPTION_STYLE_FUNCTIONS: Record<string, Set<string>> = {
  background: new Set(["linear-gradient", ...DESCRIPTION_COLOR_FUNCTIONS]),
  "background-color": DESCRIPTION_COLOR_FUNCTIONS,
  color: DESCRIPTION_COLOR_FUNCTIONS,
  border: DESCRIPTION_COLOR_FUNCTIONS,
  "border-top": DESCRIPTION_COLOR_FUNCTIONS,
  "border-right": DESCRIPTION_COLOR_FUNCTIONS,
  "border-bottom": DESCRIPTION_COLOR_FUNCTIONS,
  "border-left": DESCRIPTION_COLOR_FUNCTIONS,
  "border-color": DESCRIPTION_COLOR_FUNCTIONS,
  "grid-template-columns": new Set(["repeat", "minmax"]),
};

export const DESCRIPTION_STYLE_SOURCE_BLOCKLIST = [
  "\\", "/*", "*/", "url(", "image-set(", "var(", "env(", "attr(", "calc(",
  "expression(", "-moz-binding", "javascript:",
];
