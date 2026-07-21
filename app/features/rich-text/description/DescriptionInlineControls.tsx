import { useEditorState } from "@tiptap/react";
import type { DescriptionControlProps } from "./description-editor.types";
import { DescriptionToolbarButton } from "./DescriptionToolbarButton";

const EMPTY = { bold: false, italic: false, underline: false, strike: false };

export function DescriptionInlineControls({ editor, disabled }: DescriptionControlProps) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current?.isActive("bold") ?? false,
    italic: current?.isActive("italic") ?? false,
    underline: current?.isActive("underline") ?? false,
    strike: current?.isActive("strike") ?? false,
  }) }) ?? EMPTY;
  const locked = disabled || !editor;
  return <div className="sb-description-tool-group" aria-label="Text formatting">
    <DescriptionToolbarButton label="Bold" content={<strong>B</strong>} pressed={state.bold} disabled={locked} onPress={() => editor?.chain().focus().toggleBold().run()} />
    <DescriptionToolbarButton label="Italic" content={<em>I</em>} pressed={state.italic} disabled={locked} onPress={() => editor?.chain().focus().toggleItalic().run()} />
    <DescriptionToolbarButton label="Underline" content={<u>U</u>} pressed={state.underline} disabled={locked} onPress={() => editor?.chain().focus().toggleUnderline().run()} />
    <DescriptionToolbarButton label="Strikethrough" content={<s>S</s>} pressed={state.strike} disabled={locked} onPress={() => editor?.chain().focus().toggleStrike().run()} />
  </div>;
}
