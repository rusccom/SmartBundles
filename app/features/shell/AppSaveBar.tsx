import { SaveBar } from "@shopify/app-bridge-react";

export interface AppSaveBarProps {
  id: string;
  dirty: boolean;
  saving: boolean;
  blocked: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function AppSaveBar(props: AppSaveBarProps) {
  const progress = props.saving ? { loading: "" } : {};
  return <SaveBar id={props.id} open={props.dirty}>
    <button type="button" disabled={props.blocked} onClick={props.onDiscard}>Discard</button>
    <button type="button" variant="primary" disabled={props.blocked}
      {...progress} onClick={props.onSave}>Save</button>
  </SaveBar>;
}
