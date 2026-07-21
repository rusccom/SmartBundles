import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { StarterKit } from "@tiptap/starter-kit";
import { DescriptionEmptySpan } from "./extensions/DescriptionEmptySpan";
import { DescriptionInlineDiv } from "./extensions/DescriptionInlineDiv";
import { DescriptionLayoutBlock } from "./extensions/DescriptionLayoutBlock";
import { DescriptionNestedStyle } from "./extensions/DescriptionNestedStyle";
import { DescriptionSafeStyle } from "./extensions/DescriptionSafeStyle";
import { DescriptionStyledSpan } from "./extensions/DescriptionStyledSpan";
import { isSafeDescriptionHref } from "./description-url";

export const descriptionExtensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    horizontalRule: false,
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({
    autolink: false,
    linkOnPaste: false,
    openOnClick: false,
    protocols: ["http", "https", "mailto", "tel"],
    defaultProtocol: "https",
    HTMLAttributes: { target: null, rel: null },
    isAllowedUri: isSafeDescriptionHref,
  }),
  DescriptionLayoutBlock,
  DescriptionInlineDiv,
  DescriptionEmptySpan,
  DescriptionNestedStyle,
  DescriptionStyledSpan,
  DescriptionSafeStyle,
];
