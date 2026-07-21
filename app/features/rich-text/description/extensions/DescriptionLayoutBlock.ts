import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { descriptionElementStyle, hasOnlyInlineChildren } from "../description-dom";

export const DescriptionLayoutBlock = TiptapNode.create({
  name: "descriptionLayoutBlock",
  group: "block",
  content: "block*",
  defining: true,
  priority: 100,

  addAttributes() {
    return {
      tag: { default: "div", rendered: false },
      safeStyle: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [
      { tag: "section", getAttrs: (element) => layoutAttributes(element, "section") },
      { tag: "div", getAttrs: (element) => hasOnlyInlineChildren(element) ? false : layoutAttributes(element, "div") },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tag = node.attrs.tag === "section" ? "section" : "div";
    const style = node.attrs.safeStyle ? { style: node.attrs.safeStyle } : {};
    return [tag, mergeAttributes(HTMLAttributes, style), 0];
  },
});

function layoutAttributes(element: unknown, tag: "div" | "section") {
  return { tag, safeStyle: descriptionElementStyle(element) || null };
}
