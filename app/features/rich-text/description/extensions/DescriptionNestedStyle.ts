import { Mark, mergeAttributes } from "@tiptap/core";
import {
  descriptionElementHasContent,
  descriptionElementStyle,
  descriptionSpanBoundary,
  hasDescriptionSpanAncestor,
} from "../description-dom";

export const DescriptionNestedStyle = Mark.create({
  name: "descriptionNestedStyle",
  excludes: "",
  inclusive: false,
  spanning: true,
  priority: 130,

  addAttributes() {
    return {
      safeStyle: { default: null, rendered: false },
      boundary: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{
      tag: "span",
      getAttrs: (element) => hasDescriptionSpanAncestor(element) && descriptionElementHasContent(element)
        ? nestedStyleAttributes(element)
        : false,
    }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const style = mark.attrs.safeStyle ? { style: mark.attrs.safeStyle } : {};
    return ["span", mergeAttributes(HTMLAttributes, style), 0];
  },
});

function nestedStyleAttributes(element: unknown) {
  return {
    safeStyle: descriptionElementStyle(element) || null,
    boundary: descriptionSpanBoundary(element) || null,
  };
}
