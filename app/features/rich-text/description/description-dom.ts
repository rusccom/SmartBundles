import { canonicalDescriptionStyle } from "./description-style";

const INLINE_TAGS = new Set([
  "a", "b", "br", "del", "em", "i", "s", "span", "strike", "strong", "u",
]);
const MARK_TAGS = new Set(["a", "b", "del", "em", "i", "s", "strike", "strong", "u"]);
const BLOCK_TAGS = new Set([
  "blockquote", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ol", "p", "section", "ul",
]);

export function descriptionTagName(node: unknown): string {
  const tagName = (node as { tagName?: unknown } | null)?.tagName;
  return typeof tagName === "string" ? tagName.toLowerCase() : "";
}

export function descriptionElementStyle(node: unknown): string {
  const element = node as { getAttribute?: (name: string) => string | null } | null;
  const tagName = descriptionTagName(node);
  return tagName && element?.getAttribute ? canonicalDescriptionStyle(element.getAttribute("style") ?? "", tagName) : "";
}

export function hasOnlyInlineChildren(node: unknown): boolean {
  const element = node as { childNodes?: ArrayLike<ChildNode> } | null;
  if (!element?.childNodes) return false;
  return Array.from(element.childNodes).every(isInlineChild);
}

export function descriptionElementHasContent(node: unknown): boolean {
  const element = node as { childNodes?: ArrayLike<ChildNode> } | null;
  if (!element?.childNodes) return false;
  return Array.from(element.childNodes).some((child) => child.nodeType === 1 || Boolean(child.nodeValue?.length));
}

export function hasDescriptionSpanAncestor(node: unknown): boolean {
  return outermostDescriptionSpan(node) !== null;
}

export function descriptionSpanBoundary(node: unknown): string {
  const element = node as Node | null;
  const outer = outermostDescriptionSpan(node);
  if (!element || !outer) return "";
  const path: number[] = [];
  let current: Node | null = element;
  while (current && current !== outer) {
    const parent: Node | null = current.parentNode;
    if (!parent) return "";
    path.unshift(Array.from(parent.childNodes).indexOf(current as ChildNode));
    current = parent;
  }
  return path.join(".");
}

export function normalizeDescriptionDom(body: Element): string {
  removeComments(body);
  canonicalizeStyles(body);
  normalizeSpans(body);
  const containers = Array.from(body.querySelectorAll("section,div")).reverse();
  containers.forEach(normalizeContainer);
  normalizeBlockContainer(body);
  return body.innerHTML.trim();
}

function removeComments(node: Element): void {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 8) child.remove();
    else if (child.nodeType === 1) removeComments(child as Element);
  });
}

function canonicalizeStyles(body: Element): void {
  Array.from(body.querySelectorAll("*")).forEach((element) => {
    const style = descriptionElementStyle(element);
    if (style) element.setAttribute("style", style);
    else element.removeAttribute("style");
  });
}

function normalizeSpans(body: Element): void {
  Array.from(body.querySelectorAll("span *")).reverse()
    .filter((node) => !allowedSpanDescendant(node))
    .forEach(unwrapElement);
}

function allowedSpanDescendant(node: Element): boolean {
  const tagName = descriptionTagName(node);
  return tagName === "span" || tagName === "br" || MARK_TAGS.has(tagName);
}

function outermostDescriptionSpan(node: unknown): Element | null {
  let parent = (node as { parentElement?: Element | null } | null)?.parentElement ?? null;
  let outer: Element | null = null;
  while (parent) {
    if (descriptionTagName(parent) === "span") outer = parent;
    parent = parent.parentElement;
  }
  return outer;
}

function normalizeContainer(container: Element): void {
  if (descriptionTagName(container) === "section" || hasBlockChild(container)) {
    normalizeBlockContainer(container);
    return;
  }
  trimBoundaryWhitespace(container);
}

function normalizeBlockContainer(container: Element): void {
  const document = container.ownerDocument;
  const fragment = document.createDocumentFragment();
  let inlineRun: ChildNode[] = [];
  Array.from(container.childNodes).forEach((node) => {
    if (!isBlockChild(node)) {
      inlineRun.push(node);
      return;
    }
    appendInlineRun(fragment, inlineRun, document);
    inlineRun = [];
    fragment.append(node);
  });
  appendInlineRun(fragment, inlineRun, document);
  container.replaceChildren(fragment);
}

function appendInlineRun(target: DocumentFragment, nodes: ChildNode[], document: Document): void {
  const content = trimWhitespaceNodes(nodes);
  if (!content.some(isMeaningfulNode)) return;
  const paragraph = document.createElement("p");
  paragraph.setAttribute("style", "margin:0");
  paragraph.append(...content);
  target.append(paragraph);
}

function trimBoundaryWhitespace(element: Element): void {
  trimWhitespaceNodes(Array.from(element.childNodes));
  while (element.firstChild && whitespaceNode(element.firstChild)) element.firstChild.remove();
  while (element.lastChild && whitespaceNode(element.lastChild)) element.lastChild.remove();
}

function trimWhitespaceNodes(nodes: ChildNode[]): ChildNode[] {
  while (nodes[0] && whitespaceNode(nodes[0])) nodes.shift()?.remove();
  while (nodes.at(-1) && whitespaceNode(nodes.at(-1)!)) nodes.pop()?.remove();
  return nodes;
}

function hasBlockChild(element: Element): boolean {
  return Array.from(element.childNodes).some(isBlockChild);
}

function isBlockChild(node: ChildNode): boolean {
  return node.nodeType === 1 && BLOCK_TAGS.has(descriptionTagName(node));
}

function isInlineChild(node: ChildNode): boolean {
  if (node.nodeType === 3) return true;
  return node.nodeType === 1 && INLINE_TAGS.has(descriptionTagName(node));
}

function isMeaningfulNode(node: ChildNode): boolean {
  return node.nodeType === 1 || (node.nodeValue?.trim().length ?? 0) > 0;
}

function whitespaceNode(node: ChildNode): boolean {
  return node.nodeType === 3 && !(node.nodeValue?.trim().length ?? 0);
}

function unwrapElement(element: Element): void {
  element.replaceWith(...Array.from(element.childNodes));
}
