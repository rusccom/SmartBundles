import { useRef } from "react";
import type { BundlePreviewInput } from "./useBundlePreview";
import { useBundlePreview } from "./useBundlePreview";
import { useBundlePreviewScale } from "./useBundlePreviewScale";

export function BundlePreviewPanel(props: BundlePreviewInput) {
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const { load, source } = useBundlePreview(frame, props);
  useBundlePreviewScale(viewport, frame);
  return <s-section id="sb-preview-panel" slot="aside" padding="none">
    <s-stack direction="block" gap="base">
      <s-heading>Preview</s-heading>
      <div className="sb-preview-viewport" ref={viewport}>
        <iframe className="sb-preview-frame" title="Bundle storefront preview"
          ref={frame} srcDoc={source} onLoad={load} />
      </div>
    </s-stack>
  </s-section>;
}
