import type { useEditor } from "@tiptap/react";

export type DescriptionEditorInstance = NonNullable<ReturnType<typeof useEditor>>;

export interface DescriptionControlProps {
  editor: DescriptionEditorInstance | null;
  disabled: boolean;
}
