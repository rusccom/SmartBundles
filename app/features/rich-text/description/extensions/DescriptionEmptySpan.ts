import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import {
  descriptionElementHasContent,
  descriptionElementStyle,
  descriptionSpanBoundary,
  hasDescriptionSpanAncestor,
} from "../description-dom";

export const DescriptionEmptySpan = TiptapNode.create({
  name: "descriptionEmptySpan",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  marks: "_",
  priority: 140,

  addAttributes() {
    return {
      safeStyle: { default: null, rendered: false },
      boundary: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{
      tag: "span",
      getAttrs: (element) => isNestedEmptySpan(element)
        ? emptySpanAttributes(element)
        : false,
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = node.attrs.safeStyle ? { style: node.attrs.safeStyle } : {};
    return ["span", mergeAttributes(HTMLAttributes, style)];
  },
});

function isNestedEmptySpan(element: unknown): boolean {
  return hasDescriptionSpanAncestor(element) && !descriptionElementHasContent(element);
}

function emptySpanAttributes(element: unknown) {
  return {
    safeStyle: descriptionElementStyle(element) || null,
    boundary: descriptionSpanBoundary(element) || null,
  };
}
