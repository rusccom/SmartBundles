import { useEditorState } from "@tiptap/react";
import type { DescriptionControlProps, DescriptionEditorInstance } from "./description-editor.types";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
type HeadingLevel = typeof HEADING_LEVELS[number];

export function DescriptionBlockSelect({ editor, disabled }: DescriptionControlProps) {
  const value = useEditorState({ editor, selector: ({ editor: current }) => activeBlock(current) }) ?? "p";
  return <s-select label="Text style" labelAccessibilityVisibility="exclusive"
    value={value} disabled={disabled || !editor}
    onChange={(event) => editor && setBlock(editor, event.currentTarget.value)}>
    <s-option value="p">Paragraph</s-option>
    {HEADING_LEVELS.map((level) => <s-option key={level} value={`h${level}`}>Heading {level}</s-option>)}
    <s-option value="blockquote">Blockquote</s-option>
  </s-select>;
}

function activeBlock(editor: DescriptionEditorInstance | null): string {
  if (!editor) return "p";
  if (editor.isActive("blockquote")) return "blockquote";
  const heading = HEADING_LEVELS.find((level) => editor.isActive("heading", { level }));
  return heading ? `h${heading}` : "p";
}

function setBlock(editor: DescriptionEditorInstance, value: string): void {
  if (value === "blockquote") {
    editor.chain().focus().setParagraph().setBlockquote().run();
    return;
  }
  if (editor.isActive("blockquote")) editor.chain().focus().unsetBlockquote().run();
  const level = Number(value.slice(1)) as HeadingLevel;
  if (HEADING_LEVELS.includes(level)) editor.chain().focus().setHeading({ level }).run();
  else editor.chain().focus().setParagraph().run();
}
