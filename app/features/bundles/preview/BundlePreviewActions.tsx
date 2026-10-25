import { DESKTOP_PREVIEW_MODAL_ID } from "./BundleDesktopPreviewModal";

export function BundlePreviewActions() {
  return <s-button slot="secondary-actions" icon="desktop" command="--show"
    commandFor={DESKTOP_PREVIEW_MODAL_ID}>Desktop preview</s-button>;
}
