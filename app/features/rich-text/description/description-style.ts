import { generate, parse } from "css-tree";
import type { Declaration, DeclarationList } from "css-tree";
import { DESCRIPTION_STYLE_SOURCE_BLOCKLIST } from "./description-style-policy";
import { orderDescriptionStyleEntries } from "./description-style-order";
import type { DescriptionStyleEntry } from "./description-style-order";
import { allowedStyleDeclaration } from "./description-style-validate";

export function canonicalDescriptionStyle(source: string, tagName: string): string {
  if (!source.trim() || unsafeStyleSource(source)) return "";
  const declarations = parseDeclarations(source);
  if (!declarations) return "";
  const allowed: DescriptionStyleEntry[] = [];
  let order = 0;
  declarations.children.forEach((node) => collectDeclaration(node, tagName, allowed, order++));
  return orderDescriptionStyleEntries(allowed)
    .map(({ property, value }) => `${property}:${value}`).join(";");
}

export function descriptionStyleIsClean(source: string, tagName: string): boolean {
  if (!source.trim()) return true;
  if (unsafeStyleSource(source)) return false;
  const declarations = parseDeclarations(source);
  if (!declarations) return false;
  let clean = true;
  declarations.children.forEach((node) => {
    if (node.type !== "Declaration" || allowedStyleDeclaration(node, tagName) === null) clean = false;
  });
  return clean;
}

export function descriptionStyleProperty(style: string, property: string): string | undefined {
  const declarations = parseDeclarations(style);
  if (!declarations) return undefined;
  let result: string | undefined;
  declarations.children.forEach((node) => {
    if (node.type === "Declaration" && node.property.toLowerCase() === property) result = generate(node.value);
  });
  return result;
}

export function setDescriptionStyleProperty(
  style: string,
  property: string,
  value: string,
  tagName: string,
): string {
  return canonicalDescriptionStyle(`${style};${property}:${value}`, tagName);
}

function collectDeclaration(
  node: Declaration | object,
  tagName: string,
  target: DescriptionStyleEntry[],
  order: number,
): void {
  if (!("type" in node) || node.type !== "Declaration") return;
  const declaration = node as Declaration;
  const value = allowedStyleDeclaration(declaration, tagName);
  if (value !== null) target.push({ property: declaration.property.toLowerCase(), value, order });
}

function parseDeclarations(source: string): DeclarationList | null {
  try {
    const parsed = parse(source, { context: "declarationList" });
    return parsed.type === "DeclarationList" ? parsed : null;
  } catch {
    return null;
  }
}

function unsafeStyleSource(source: string): boolean {
  const lower = source.toLowerCase();
  return DESCRIPTION_STYLE_SOURCE_BLOCKLIST.some((token) => lower.includes(token));
}
