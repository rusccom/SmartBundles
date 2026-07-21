import { generate, lexer, walk } from "css-tree";
import type { CssNode, Declaration } from "css-tree";
import {
  DESCRIPTION_LAYOUT_TAGS,
  DESCRIPTION_SIZED_TAGS,
  DESCRIPTION_STYLE_FUNCTIONS,
  DESCRIPTION_STYLE_PROPERTIES,
} from "./description-style-policy";

const NUMBER = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const LENGTH = new RegExp(`^(${NUMBER})(px|rem|em|%)?$`);
const SIGNED_LENGTH = new RegExp(`^(-?${NUMBER})(px|rem|em)?$`);
const GRID = /^repeat\([1-4],minmax\(0,(?:\d+(?:\.\d+)?|\.\d+)fr\)\)$/;

export function allowedStyleDeclaration(declaration: Declaration, tagName: string): string | null {
  const property = declaration.property.toLowerCase();
  if (!DESCRIPTION_STYLE_PROPERTIES.has(property) || declaration.important) return null;
  if (property.startsWith("-") || !safeValueAst(declaration.value, property)) return null;
  if (lexer.matchProperty(property, declaration.value).error) return null;
  const value = generate(declaration.value).trim();
  return validPropertyValue(property, value, tagName, declaration.value) ? value : null;
}

function safeValueAst(value: CssNode, property: string): boolean {
  let safe = true;
  const allowedFunctions = DESCRIPTION_STYLE_FUNCTIONS[property] ?? new Set<string>();
  walk(value, (node) => {
    if (node.type === "Raw" || node.type === "Url") safe = false;
    if (node.type === "Function" && !allowedFunctions.has(node.name.toLowerCase())) safe = false;
  });
  return safe;
}

function validPropertyValue(property: string, value: string, tagName: string, valueAst: CssNode): boolean {
  if (property === "color" || property === "background-color") return validColor(value);
  if (property === "background") return validBackground(value);
  if (property === "font-family") return value.length <= 200;
  if (property === "font-size") return boundedLength(value, 128);
  if (property === "font-style") return /^(?:normal|italic|oblique)$/.test(value);
  if (property === "font-weight") return /^(?:normal|bold|[1-9]00)$/.test(value);
  if (property === "line-height") return validLineHeight(value);
  if (property === "letter-spacing") return value === "normal" || boundedSignedLength(value, 20);
  if (property === "text-align") return /^(?:left|center|right)$/.test(value);
  if (property === "text-transform") return /^(?:none|uppercase|lowercase|capitalize)$/.test(value);
  if (property === "text-decoration") return /^(?:none|underline|line-through)$/.test(value);
  if (property.startsWith("margin")) return boundedBox(value, 200);
  if (property.startsWith("padding")) return boundedBox(value, 200);
  if (property.startsWith("border")) return validBorder(property, value, valueAst);
  return validLayoutProperty(property, value, tagName);
}

function validColor(value: string): boolean {
  try { return !lexer.matchType("color", value).error; }
  catch { return false; }
}

function validBackground(value: string): boolean {
  if (validColor(value)) return true;
  return value.startsWith("linear-gradient(") && value.endsWith(")") && value.length <= 500;
}

function validLineHeight(value: string): boolean {
  if (value === "normal") return true;
  if (new RegExp(`^${NUMBER}$`).test(value)) return boundedNumberRange(value, 0.5, 4);
  return boundedLength(value, 200);
}

function validBorder(property: string, value: string, valueAst: CssNode): boolean {
  if (property.includes("radius")) return boundedBox(value, 1000);
  if (property === "border-style") return validBorderStyles(value);
  if (property === "border-color") return value.length <= 200;
  return value.length <= 200 && borderWidthsSafe(valueAst);
}

function validLayoutProperty(property: string, value: string, tagName: string): boolean {
  if (property === "display") return validDisplay(value, tagName);
  if (property === "box-sizing") return DESCRIPTION_SIZED_TAGS.has(tagName) && /^(?:border-box|content-box)$/.test(value);
  if (/^(?:min-|max-)?(?:width|height)$/.test(property)) return DESCRIPTION_SIZED_TAGS.has(tagName) && validSize(value);
  if (/^(?:row-|column-)?gap$/.test(property)) return DESCRIPTION_LAYOUT_TAGS.has(tagName) && boundedBox(value, 100);
  if (property === "grid-template-columns") return DESCRIPTION_LAYOUT_TAGS.has(tagName) && GRID.test(value);
  return DESCRIPTION_LAYOUT_TAGS.has(tagName) && validFlexProperty(property, value);
}

function validDisplay(value: string, tagName: string): boolean {
  if (tagName === "span") return /^(?:inline|inline-block)$/.test(value);
  return DESCRIPTION_LAYOUT_TAGS.has(tagName) && /^(?:block|inline-block|flex|inline-flex|grid)$/.test(value);
}

function validFlexProperty(property: string, value: string): boolean {
  if (property === "flex-direction") return /^(?:row|row-reverse|column|column-reverse)$/.test(value);
  if (property === "flex-wrap") return /^(?:nowrap|wrap|wrap-reverse)$/.test(value);
  if (property === "justify-content") return /^(?:normal|start|end|center|space-between|space-around|space-evenly)$/.test(value);
  if (property === "align-items" || property === "align-content") return /^(?:normal|start|end|center|stretch|space-between|space-around)$/.test(value);
  if (property === "flex-basis") return validSize(value);
  if (property === "flex-grow" || property === "flex-shrink") return boundedNumber(value, 10);
  return property === "flex" && validFlexShorthand(value);
}

function validFlexShorthand(value: string): boolean {
  if (/^(?:none|auto|initial)$/.test(value)) return true;
  const parts = value.split(/\s+/);
  if (!parts.length || parts.length > 3 || !boundedNumber(parts[0], 10)) return false;
  if (parts.length === 1) return true;
  if (parts.length === 2) return boundedNumber(parts[1], 10) || validSize(parts[1]);
  return boundedNumber(parts[1], 10) && validSize(parts[2]);
}

function validBorderStyles(value: string): boolean {
  const style = "(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)";
  return new RegExp(`^${style}(?: ${style}){0,3}$`).test(value);
}

function borderWidthsSafe(value: CssNode): boolean {
  if (value.type !== "Value") return false;
  let safe = true;
  value.children.forEach((node) => {
    if (node.type === "Dimension") safe = safe && boundedBorderDimension(node.value, node.unit);
    if (node.type === "Number") safe = safe && Number(node.value) === 0;
  });
  return safe;
}

function boundedBorderDimension(value: string, unit: string): boolean {
  return boundedCssLength(`${value}${unit.toLowerCase()}`, 8, false);
}

function validSize(value: string): boolean {
  return value === "auto" || boundedLength(value, 1600);
}

function boundedBox(value: string, maximum: number): boolean {
  const parts = value.split(" ");
  return parts.length <= 4 && parts.every((part) => boundedLength(part, maximum));
}

function boundedLength(value: string, maximum: number): boolean {
  return boundedCssLength(value, maximum, false);
}

function boundedSignedLength(value: string, maximum: number): boolean {
  return boundedCssLength(value, maximum, true);
}

function boundedCssLength(value: string, maximum: number, signed: boolean): boolean {
  const match = value.match(signed ? SIGNED_LENGTH : LENGTH);
  if (!match) return false;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  if (!Number.isFinite(amount)) return false;
  if (unit === "%") return amount >= 0 && amount <= 100;
  const scale = unit === "rem" || unit === "em" ? 16 : 1;
  return Math.abs(amount * scale) <= maximum;
}

function boundedNumber(value: string, maximum: number): boolean {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= maximum;
}

function boundedNumberRange(value: string, minimum: number, maximum: number): boolean {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}
