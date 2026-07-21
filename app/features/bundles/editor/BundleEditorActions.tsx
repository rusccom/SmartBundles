export interface BundleEditorActionsProps { status: string; busy: boolean; replacing: boolean }

export function BundleEditorActions({ status, busy, replacing }: BundleEditorActionsProps) {
  const activateLabel = replacing ? "Replace and activate" : status === "ACTIVE" ? "Save and publish changes" : "Activate bundle";
  return <div className="sb-editor-actions">
    {canPause(status) ? <button type="submit" name="intent" value="pause" formNoValidate disabled={busy}>Pause bundle</button> : null}
    <button type="submit" name="intent" value="save" disabled={busy}>Save draft</button>
    <button type="submit" name="intent" value="activate" className="primary" disabled={busy}>{activateLabel}</button>
  </div>;
}

function canPause(status: string): boolean {
  return ["ACTIVE", "NEEDS_ATTENTION"].includes(status);
}
