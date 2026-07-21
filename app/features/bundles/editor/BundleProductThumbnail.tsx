import { useState } from "react";

export interface BundleProductThumbnailProps {
  imageUrl?: string;
  title: string;
}

export function BundleProductThumbnail({ imageUrl, title }: BundleProductThumbnailProps) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return <s-thumbnail src={imageUrl} alt="" size="small" onError={() => setFailed(true)} />;
  }
  return <span className="sb-product-thumbnail-fallback" title={`No image for ${title}`} aria-hidden="true">
    <s-icon type="image" />
  </span>;
}
