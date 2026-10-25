import { EditorContent } from "@tiptap/react";
import type { DescriptionEditorProps } from "./DescriptionEditor";
import { DescriptionToolbar } from "./DescriptionToolbar";
import type { useDescriptionEditor } from "./useDescriptionEditor";

interface DescriptionEditorControlProps extends DescriptionEditorProps {
  state: ReturnType<typeof useDescriptionEditor>;
}

export function DescriptionEditorControl({ state, disabled, value, error }: DescriptionEditorControlProps) {
  return <s-box border="base" borderRadius="base" background="base" overflow="hidden">
    <DescriptionToolbar editor={state.editor} htmlMode={state.htmlMode}
      disabled={disabled} onToggleMode={state.toggleMode} />
    <div className="sb-description-visual" hidden={state.htmlMode}>
      <EditorContent editor={state.editor} />
    </div>
    {state.htmlMode ? <s-box padding="small">
      <s-text-area label="Description HTML source" rows={10} disabled={disabled}
        value={value} error={error} onInput={(event) => state.setRawValue(event.currentTarget.value)} />
    </s-box> : null}
  </s-box>;
}
