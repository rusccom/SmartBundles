import { Extension } from "@tiptap/core";
import { canonicalDescriptionStyle } from "../description-style";

const TYPES = [
  "paragraph", "heading", "blockquote", "bulletList", "orderedList", "listItem",
  "bold", "italic", "underline", "strike", "link",
];

export const DescriptionSafeStyle = Extension.create({
  name: "descriptionSafeStyle",

  addGlobalAttributes() {
    return [{
      types: TYPES,
      attributes: {
        safeStyle: {
          default: null,
          parseHTML: (element) => styleAttribute(element),
          renderHTML: (attributes) => attributes.safeStyle ? { style: attributes.safeStyle } : {},
        },
      },
    }];
  },
});

function styleAttribute(element: unknown): string | null {
  const candidate = element as { tagName?: unknown; getAttribute?: (name: string) => string | null } | null;
  if (!candidate?.getAttribute || typeof candidate.tagName !== "string") return null;
  return canonicalDescriptionStyle(candidate.getAttribute("style") ?? "", candidate.tagName.toLowerCase()) || null;
}
