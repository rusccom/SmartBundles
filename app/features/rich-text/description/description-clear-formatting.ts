import { Fragment } from "@tiptap/pm/model";
import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";
import type { Selection, Transaction } from "@tiptap/pm/state";
import type { DescriptionEditorInstance } from "./description-editor.types";

const TEXT_STYLE_NODES = new Set([
  "paragraph", "heading", "blockquote", "bulletList", "orderedList", "listItem",
]);

interface StyledSpanRange {
  position: number;
  from: number;
  to: number;
  cursor: boolean;
}

export function clearDescriptionFormatting(editor: DescriptionEditorInstance): void {
  editor.chain().focus().unsetAllMarks().command(({ tr }) => {
    tr.setStoredMarks([]);
    selectedTextStylePositions(tr.doc, tr.selection)
      .forEach((position) => clearTextStyleAt(tr, position));
    selectedStyledSpans(tr.doc, tr.selection)
      .sort((left, right) => right.position - left.position)
      .forEach((range) => clearStyledSpan(tr, range));
    return true;
  }).run();
}

function selectedTextStylePositions(doc: ProseMirrorNode, selection: Selection): number[] {
  const positions = new Set<number>();
  if (selection.empty) {
    collectTextStyleAncestors(selection.$from, positions);
  } else {
    doc.nodesBetween(selection.from, selection.to, (node, position) => collectTextStyle(node, position, positions));
  }
  return Array.from(positions).sort((left, right) => right - left);
}

function collectTextStyleAncestors(position: ResolvedPos, target: Set<number>): void {
  for (let depth = 1; depth <= position.depth; depth += 1) {
    collectTextStyle(position.node(depth), position.before(depth), target);
  }
}

function collectTextStyle(node: ProseMirrorNode, position: number, target: Set<number>): void {
  if (TEXT_STYLE_NODES.has(node.type.name)) target.add(position);
}

function clearTextStyleAt(transaction: Transaction, position: number): void {
  const node = transaction.doc.nodeAt(position);
  if (!node || !TEXT_STYLE_NODES.has(node.type.name)) return;
  const paragraph = transaction.doc.type.schema.nodes.paragraph;
  if (node.type.name === "heading") transaction.setNodeMarkup(position, paragraph, { safeStyle: null });
  else if (node.attrs.safeStyle) transaction.setNodeMarkup(position, undefined, { ...node.attrs, safeStyle: null });
}

function selectedStyledSpans(doc: ProseMirrorNode, selection: Selection): StyledSpanRange[] {
  if (selection.empty) return cursorStyledSpan(selection.$from);
  const ranges: StyledSpanRange[] = [];
  doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.type.name !== "descriptionStyledSpan") return;
    const start = position + 1;
    ranges.push({ position, from: Math.max(0, selection.from - start), to: Math.min(node.content.size, selection.to - start), cursor: false });
  });
  return ranges;
}

function cursorStyledSpan(position: ResolvedPos): StyledSpanRange[] {
  for (let depth = position.depth; depth > 0; depth -= 1) {
    const node = position.node(depth);
    if (node.type.name === "descriptionStyledSpan") {
      const nodePosition = position.before(depth);
      return [{ position: nodePosition, from: 0, to: node.content.size, cursor: true }];
    }
  }
  return [];
}

function clearStyledSpan(transaction: Transaction, range: StyledSpanRange): void {
  const node = transaction.doc.nodeAt(range.position);
  if (!node || node.type.name !== "descriptionStyledSpan") return;
  if (range.cursor) {
    transaction.replaceWith(range.position, range.position + node.nodeSize, withoutMarks(node.content));
    return;
  }
  const replacement = splitStyledSpan(node, range.from, range.to);
  transaction.replaceWith(range.position, range.position + node.nodeSize, replacement);
}

function splitStyledSpan(node: ProseMirrorNode, from: number, to: number): Fragment {
  const nodes: ProseMirrorNode[] = [];
  appendStyledPart(nodes, node, node.content.cut(0, from));
  nodes.push(...clearedFragmentNodes(node.content.cut(from, to)));
  appendStyledPart(nodes, node, node.content.cut(to));
  return Fragment.fromArray(nodes);
}

function appendStyledPart(target: ProseMirrorNode[], source: ProseMirrorNode, content: Fragment): void {
  if (content.size) target.push(source.type.create(source.attrs, content, source.marks));
}

function fragmentNodes(fragment: Fragment): ProseMirrorNode[] {
  const nodes: ProseMirrorNode[] = [];
  fragment.forEach((node) => nodes.push(node));
  return nodes;
}

function withoutMarks(fragment: Fragment): Fragment {
  return Fragment.fromArray(clearedFragmentNodes(fragment));
}

function clearedFragmentNodes(fragment: Fragment): ProseMirrorNode[] {
  return fragmentNodes(fragment).map(clearInlineNode);
}

function clearInlineNode(node: ProseMirrorNode): ProseMirrorNode {
  if (node.type.name === "descriptionEmptySpan") {
    return node.type.create({ ...node.attrs, safeStyle: null }, null, []);
  }
  return node.mark([]);
}
