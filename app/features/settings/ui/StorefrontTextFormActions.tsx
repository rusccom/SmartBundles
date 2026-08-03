export interface StorefrontTextFormActionsProps {
  dirty: boolean;
  busy: boolean;
}

export function StorefrontTextFormActions(props: StorefrontTextFormActionsProps) {
  return <div className="sb-settings-save-bar">
    <span aria-live="polite">Changes apply to every bundle. Active bundles update after saving.</span>
    <s-button type="submit" variant="primary" disabled={!props.dirty || props.busy}>
      {props.busy ? "Saving…" : "Save texts"}
    </s-button>
  </div>;
}
