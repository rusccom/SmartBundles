import { useEffect, useRef } from "react";
import { SaveBar } from "@shopify/app-bridge-react";

export interface BundleEditorSaveBarProps {
  open: boolean;
  busy: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function BundleEditorSaveBar(props: BundleEditorSaveBarProps) {
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    saveButtonRef.current?.toggleAttribute("loading", props.busy);
  }, [props.busy]);
  return <SaveBar id="bundle-editor-save-bar" open={props.open} discardConfirmation>
    <button type="button" disabled={props.busy} onClick={props.onDiscard}>Discard</button>
    <button ref={saveButtonRef} type="button" variant="primary"
      onClick={props.onSave}>Save</button>
  </SaveBar>;
}
