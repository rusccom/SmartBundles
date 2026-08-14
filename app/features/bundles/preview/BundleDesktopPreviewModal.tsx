import { BundlePreviewFrame } from "./BundlePreviewFrame";
import type { BundlePreviewInput } from "./useBundlePreview";

export const DESKTOP_PREVIEW_MODAL_ID = "sb-desktop-preview-modal";

export function BundleDesktopPreviewModal(props: BundlePreviewInput) {
  return <s-modal id={DESKTOP_PREVIEW_MODAL_ID} heading="Desktop preview"
    size="large-100" padding="none">
    <BundlePreviewFrame {...props} mode="desktop" />
    <s-button slot="primary-action" variant="primary" command="--hide"
      commandFor={DESKTOP_PREVIEW_MODAL_ID}>Close</s-button>
  </s-modal>;
}
