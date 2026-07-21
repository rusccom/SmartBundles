import { useEditorState } from "@tiptap/react";
import type { DescriptionControlProps } from "./description-editor.types";
import { clearDescriptionFormatting } from "./description-clear-formatting";
import { DescriptionToolbarButton } from "./DescriptionToolbarButton";

export function DescriptionHistoryControls({ editor, disabled }: DescriptionControlProps) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    undo: current?.can().chain().undo().run() ?? false,
    redo: current?.can().chain().redo().run() ?? false,
  }) }) ?? { undo: false, redo: false };
  return <div className="sb-description-tool-group" aria-label="History and cleanup">
    <DescriptionToolbarButton label="Undo" content="↶" disabled={disabled || !state.undo} onPress={() => editor?.chain().focus().undo().run()} />
    <DescriptionToolbarButton label="Redo" content="↷" disabled={disabled || !state.redo} onPress={() => editor?.chain().focus().redo().run()} />
    <DescriptionToolbarButton label="Clear formatting" content="Tx" disabled={disabled || !editor} onPress={() => editor && clearDescriptionFormatting(editor)} />
  </div>;
}
