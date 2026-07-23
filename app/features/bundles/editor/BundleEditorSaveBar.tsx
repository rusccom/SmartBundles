import { SaveBar } from "@shopify/app-bridge-react";

export interface BundleEditorSaveBarProps {
  dirty: boolean;
  saving: boolean;
  blocked: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function BundleEditorSaveBar(props: BundleEditorSaveBarProps) {
  return <SaveBar id="bundle-editor-save-bar" open={props.dirty}>
    <button type="button" disabled={props.blocked} onClick={props.onDiscard}>Discard</button>
    <button type="button" variant="primary" disabled={props.blocked}
      onClick={props.onSave}>{props.saving ? "Saving..." : "Save"}</button>
  </SaveBar>;
}
