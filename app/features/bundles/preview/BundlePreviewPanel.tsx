import { BundleEditorSection } from "../editor/BundleEditorSection";
import { BundleDesktopPreviewModal } from "./BundleDesktopPreviewModal";
import { BundlePreviewFrame } from "./BundlePreviewFrame";
import { BundlePreviewActions } from "./BundlePreviewActions";
import type { BundlePreviewInput } from "./useBundlePreview";

export function BundlePreviewPanel(props: BundlePreviewInput) {
  return <>
    <BundleEditorSection heading="Preview" actions={<BundlePreviewActions />}>
      <BundlePreviewFrame {...props} mode="mobile" />
    </BundleEditorSection>
    <BundleDesktopPreviewModal {...props} />
  </>;
}
