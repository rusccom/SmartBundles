import { DESKTOP_PREVIEW_MODAL_ID } from "./BundleDesktopPreviewModal";

export function BundlePreviewHeader() {
  return <div className="sb-preview-header">
    <s-heading>Preview</s-heading>
    <div className="sb-preview-actions">
      <s-button icon="mobile" variant="primary"
        accessibilityLabel="Mobile preview selected" />
      <s-button icon="desktop" variant="secondary" command="--show"
        commandFor={DESKTOP_PREVIEW_MODAL_ID} accessibilityLabel="Open desktop preview" />
    </div>
  </div>;
}
