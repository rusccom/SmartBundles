import { SaveBar } from "@shopify/app-bridge-react";

export interface BundleEditorSaveBarProps {
  open: boolean;
  busy: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function BundleEditorSaveBar(props: BundleEditorSaveBarProps) {
  return <SaveBar id="bundle-editor-save-bar" open={props.open} discardConfirmation>
    <button type="button" disabled={props.busy} onClick={props.onDiscard}>Discard</button>
    <button type="button" variant="primary" disabled={props.busy} loading={props.busy}
      onClick={props.onSave}>Save</button>
  </SaveBar>;
}
