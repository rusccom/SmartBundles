import type { JSONContent } from "@tiptap/core";

const MAX_DOCUMENT_COMPLEXITY = 2_000;
const MAX_DOCUMENT_DEPTH = 30;
const MAX_MARKS_PER_NODE = 30;

export function descriptionDocumentWithinLimits(document: JSONContent): boolean {
  const counter = { units: 0 };
  return visitNode(document, 1, counter);
}

function visitNode(node: JSONContent, depth: number, counter: { units: number }): boolean {
  const marks = node.marks?.length ?? 0;
  counter.units += 1 + marks;
  if (marks > MAX_MARKS_PER_NODE || depth > MAX_DOCUMENT_DEPTH) return false;
  if (counter.units > MAX_DOCUMENT_COMPLEXITY) return false;
  return (node.content ?? []).every((child) => visitNode(child, depth + 1, counter));
}
