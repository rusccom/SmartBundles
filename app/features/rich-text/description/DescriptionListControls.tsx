import { useEditorState } from "@tiptap/react";
import type { DescriptionControlProps } from "./description-editor.types";
import { DescriptionToolbarButton } from "./DescriptionToolbarButton";

export function DescriptionListControls({ editor, disabled }: DescriptionControlProps) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bullet: current?.isActive("bulletList") ?? false,
    ordered: current?.isActive("orderedList") ?? false,
  }) }) ?? { bullet: false, ordered: false };
  const locked = disabled || !editor;
  return <div className="sb-description-tool-group" aria-label="Lists">
    <DescriptionToolbarButton label="Bulleted list" content="• List" pressed={state.bullet} disabled={locked} onPress={() => editor?.chain().focus().toggleBulletList().run()} />
    <DescriptionToolbarButton label="Numbered list" content="1. List" pressed={state.ordered} disabled={locked} onPress={() => editor?.chain().focus().toggleOrderedList().run()} />
  </div>;
}
