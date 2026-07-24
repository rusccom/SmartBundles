import { useEffect } from "react";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";

const SAVE_BAR_ID = "bundle-editor-save-bar";

export interface BundleEditorSaveBarProps {
  dirty: boolean;
  saving: boolean;
  blocked: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function BundleEditorSaveBar(props: BundleEditorSaveBarProps) {
  useSaveBarSync(props.dirty);
  return <SaveBar id={SAVE_BAR_ID} open={props.dirty}>
    <button type="button" disabled={props.blocked} onClick={props.onDiscard}>Discard</button>
    <button type="button" variant="primary" disabled={props.blocked}
      onClick={props.onSave}>{props.saving ? "Saving..." : "Save"}</button>
  </SaveBar>;
}

function useSaveBarSync(dirty: boolean): void {
  const shopify = useAppBridge();
  useEffect(() => {
    const sync = dirty ? shopify.saveBar.show(SAVE_BAR_ID) : shopify.saveBar.hide(SAVE_BAR_ID);
    void sync;
  }, [dirty, shopify]);
  useEffect(() => () => {
    void shopify.saveBar.hide(SAVE_BAR_ID);
  }, [shopify]);
}
