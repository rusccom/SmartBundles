import { DescriptionEditorControl } from "./DescriptionEditorControl";
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
    <s-text id="sb-description-label" type="strong">Description</s-text>
    <DescriptionEditorControl {...props} state={state} />
    {props.error ? <s-banner id="sb-description-error" tone="critical">{props.error}</s-banner> : null}
  </div>;
}
