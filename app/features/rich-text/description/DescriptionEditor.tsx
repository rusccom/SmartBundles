import { EditorContent } from "@tiptap/react";
import { DescriptionToolbar } from "./DescriptionToolbar";
import { useDescriptionEditor } from "./useDescriptionEditor";
import "./description-editor.css";

export interface DescriptionEditorProps {
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}

export function DescriptionEditor(props: DescriptionEditorProps) {
  const state = useDescriptionEditor(props);
  return <div className="sb-description-field">
    <label id="sb-description-label" className="sb-description-label"
      htmlFor="sb-description-input">Description</label>
    {descriptionControl(props, state)}
    {props.error ? <span id="sb-description-error" className="sb-description-error"
      role="alert">{props.error}</span> : null}
  </div>;
}

function descriptionControl(
  props: DescriptionEditorProps,
  state: ReturnType<typeof useDescriptionEditor>,
) {
  return <div className={`sb-description-editor${props.error ? " sb-description-editor-error" : ""}`}
    aria-invalid={Boolean(props.error)}>
    <DescriptionToolbar editor={state.editor} htmlMode={state.htmlMode}
      onToggleMode={state.toggleMode} />
    <div className="sb-description-visual" hidden={state.htmlMode}>
      <EditorContent editor={state.editor} />
    </div>
    <textarea className="sb-description-html" aria-label="Description HTML source"
      aria-describedby={props.error ? "sb-description-error" : undefined}
      aria-invalid={Boolean(props.error)} hidden={!state.htmlMode} disabled={props.disabled}
      spellCheck={false} value={props.value}
      onChange={(event) => state.setRawValue(event.target.value)} />
  </div>;
}
