import { useEditorState } from "@tiptap/react";
import type { DescriptionControlProps, DescriptionEditorInstance } from "./description-editor.types";
import { descriptionStyleProperty, setDescriptionStyleProperty } from "./description-style";
import { DescriptionToolbarButton } from "./DescriptionToolbarButton";

export function DescriptionAlignControls({ editor, disabled }: DescriptionControlProps) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => alignState(current) }) ?? { left: true, center: false, right: false };
  const locked = disabled || !editor;
  return <div className="sb-description-tool-group" aria-label="Alignment">
    <DescriptionToolbarButton label="Align left" content="≡" pressed={state.left} disabled={locked} onPress={() => setAlignment(editor, "left")} />
    <DescriptionToolbarButton label="Align center" content="≣" pressed={state.center} disabled={locked} onPress={() => setAlignment(editor, "center")} />
    <DescriptionToolbarButton label="Align right" content="≡" pressed={state.right} disabled={locked} onPress={() => setAlignment(editor, "right")} />
  </div>;
}

function alignState(editor: DescriptionControlProps["editor"]) {
  const alignment = editor ? descriptionStyleProperty(activeTextStyle(editor), "text-align") : undefined;
  const center = alignment === "center";
  const right = alignment === "right";
  return { left: !center && !right, center, right };
}

function setAlignment(editor: DescriptionEditorInstance | null, alignment: string): void {
  if (!editor) return;
  const nodeName = editor.isActive("heading") ? "heading" : "paragraph";
  const attributes = editor.getAttributes(nodeName);
  const tagName = nodeName === "heading" ? `h${attributes.level ?? 2}` : "p";
  const safeStyle = setDescriptionStyleProperty(String(attributes.safeStyle ?? ""), "text-align", alignment, tagName);
  editor.chain().focus().updateAttributes(nodeName, { safeStyle: safeStyle || null }).run();
}

function activeTextStyle(editor: DescriptionEditorInstance): string {
  const nodeName = editor.isActive("heading") ? "heading" : "paragraph";
  return String(editor.getAttributes(nodeName).safeStyle ?? "");
}
