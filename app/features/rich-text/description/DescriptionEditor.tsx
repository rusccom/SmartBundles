import { EditorContent } from "@tiptap/react";
import { DescriptionToolbar } from "./DescriptionToolbar";
import { useDescriptionEditor } from "./useDescriptionEditor";
import "./description-editor.css";

export interface DescriptionEditorProps {
  initialValue: string;
  error?: string;
}

export function DescriptionEditor({ initialValue, error }: DescriptionEditorProps) {
  const state = useDescriptionEditor(initialValue, error);
  return <div className="sb-description-field">
    <label id="sb-description-label" className="sb-description-label" htmlFor="sb-description-input">Description</label>
    <div className={`sb-description-editor${error ? " sb-description-editor-error" : ""}`} aria-invalid={Boolean(error)}>
      <DescriptionToolbar editor={state.editor} htmlMode={state.htmlMode} onToggleMode={state.toggleMode} />
      <div className="sb-description-visual" hidden={state.htmlMode}><EditorContent editor={state.editor} /></div>
      <textarea className="sb-description-html" aria-label="Description HTML source" aria-describedby="sb-description-help sb-description-warning sb-description-error" aria-invalid={Boolean(error)} hidden={!state.htmlMode} spellCheck={false} value={state.value} onChange={(event) => state.setRawValue(event.target.value)} />
    </div>
    <input type="hidden" name="descriptionHtml" value={state.value} />
    <input type="hidden" name="descriptionDirty" value={state.dirty ? "yes" : "no"} />
    <span id="sb-description-help" className="sb-description-help">Shopify is the source of truth. HTML is sent only after you edit this field.</span>
    <span id="sb-description-warning" className="sb-description-warning" role={state.warning ? "status" : undefined}>{state.warning}</span>
    <span id="sb-description-error" className="sb-description-error" role={error ? "alert" : undefined}>{error}</span>
  </div>;
}
