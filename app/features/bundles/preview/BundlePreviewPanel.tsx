import { BundleDesktopPreviewModal } from "./BundleDesktopPreviewModal";
import { BundlePreviewFrame } from "./BundlePreviewFrame";
import { BundlePreviewHeader } from "./BundlePreviewHeader";
import type { BundlePreviewInput } from "./useBundlePreview";

export function BundlePreviewPanel(props: BundlePreviewInput) {
  return <s-section padding="none">
    <s-box padding="small">
      <s-stack direction="block" gap="base">
        <BundlePreviewHeader />
        <BundlePreviewFrame {...props} mode="mobile" />
      </s-stack>
    </s-box>
    <BundleDesktopPreviewModal {...props} />
  </s-section>;
}
