import { useState } from "react";

export interface BundleProductThumbnailProps {
  imageUrl?: string;
  title: string;
}

export function BundleProductThumbnail({ imageUrl, title }: BundleProductThumbnailProps) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return <img className="sb-product-thumbnail" src={imageUrl} alt="" onError={() => setFailed(true)} />;
  }
  return <span className="sb-product-thumbnail-fallback" title={`No image for ${title}`} aria-hidden="true">
    <s-icon type="image" />
  </span>;
}
