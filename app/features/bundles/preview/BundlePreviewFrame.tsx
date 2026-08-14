import { useRef } from "react";
import type { BundlePreviewInput } from "./useBundlePreview";
import { useBundlePreview } from "./useBundlePreview";
import { useBundlePreviewScale } from "./useBundlePreviewScale";

type BundlePreviewMode = "mobile" | "desktop";

interface BundlePreviewFrameProps extends BundlePreviewInput {
  mode: BundlePreviewMode;
}

const PREVIEW_WIDTHS: Record<BundlePreviewMode, number> = {
  mobile: 390,
  desktop: 1280,
};

export function BundlePreviewFrame(props: BundlePreviewFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const { load, source } = useBundlePreview(frame, props);
  useBundlePreviewScale(viewport, frame, PREVIEW_WIDTHS[props.mode]);
  return <div className={`sb-preview-viewport sb-preview-viewport--${props.mode}`} ref={viewport}>
    <iframe className="sb-preview-frame" title={`${props.mode} bundle storefront preview`}
      ref={frame} srcDoc={source} onLoad={load} />
  </div>;
}
