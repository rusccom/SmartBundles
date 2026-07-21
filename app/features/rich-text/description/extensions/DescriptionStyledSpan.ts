import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { descriptionElementStyle, hasDescriptionSpanAncestor } from "../description-dom";

export const DescriptionStyledSpan = TiptapNode.create({
  name: "descriptionStyledSpan",
  group: "inline",
  inline: true,
  content: "(text|hardBreak|descriptionEmptySpan)*",
  selectable: false,
  defining: true,
  isolating: true,
  priority: 120,

  addAttributes() {
    return { safeStyle: { default: null, rendered: false } };
  },

  parseHTML() {
    return [{
      tag: "span",
      getAttrs: (element) => hasDescriptionSpanAncestor(element)
        ? false
        : { safeStyle: descriptionElementStyle(element) || null },
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = node.attrs.safeStyle ? { style: node.attrs.safeStyle } : {};
    return ["span", mergeAttributes(HTMLAttributes, style), 0];
  },
});
