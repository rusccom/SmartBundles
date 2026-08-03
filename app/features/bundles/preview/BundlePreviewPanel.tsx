import { useRef } from "react";
import type { BundlePreviewInput } from "./useBundlePreview";
import { useBundlePreview } from "./useBundlePreview";

export function BundlePreviewPanel(props: BundlePreviewInput) {
  const frame = useRef<HTMLIFrameElement>(null);
  const { load, source } = useBundlePreview(frame, props);
  return <aside className="sb-preview">
    <div className="sb-preview-header">
      <s-heading>Preview bundle</s-heading>
      <s-paragraph>How this bundle appears on the product page.</s-paragraph>
    </div>
    <iframe className="sb-preview-frame" title="Bundle storefront preview"
      ref={frame} srcDoc={source} onLoad={load} />
  </aside>;
}
