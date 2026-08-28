import { useEffect } from "react";
import type { BundleMediaDraft } from "./bundle-media.types";

export function useBundleMediaObjectUrl(media: BundleMediaDraft): void {
  const url = media.kind === "upload" ? media.image.url : undefined;
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
}
