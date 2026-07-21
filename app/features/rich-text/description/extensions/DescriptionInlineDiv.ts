import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { descriptionElementStyle, hasOnlyInlineChildren } from "../description-dom";

export const DescriptionInlineDiv = TiptapNode.create({
  name: "descriptionInlineDiv",
  group: "block",
  content: "inline*",
  defining: true,
  priority: 120,

  addAttributes() {
    return { safeStyle: { default: null, rendered: false } };
  },

  parseHTML() {
    return [{
      tag: "div",
      getAttrs: (element) => hasOnlyInlineChildren(element)
        ? { safeStyle: descriptionElementStyle(element) || null }
        : false,
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = node.attrs.safeStyle ? { style: node.attrs.safeStyle } : {};
    return ["div", mergeAttributes(HTMLAttributes, style), 0];
  },
});
