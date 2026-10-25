import { useState } from "react";

export interface BundleProductThumbnailProps {
  imageUrl?: string;
  title: string;
}

export function BundleProductThumbnail({ imageUrl, title }: BundleProductThumbnailProps) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return <s-thumbnail src={failedUrl === imageUrl ? undefined : imageUrl}
    alt={`Image of ${title}`} size="large" onError={() => setFailedUrl(imageUrl)} />;
}
