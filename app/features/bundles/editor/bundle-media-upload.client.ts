import type { BundleMediaDraft } from "./bundle-media.types";

export const BUNDLE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function imageFileError(file?: File): string | undefined {
  if (!file) return "Choose an image file.";
  if (!BUNDLE_IMAGE_ACCEPT.split(",").includes(file.type)) {
    return "Choose a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) return "The image must be 10 MB or smaller.";
  return undefined;
}

export async function uploadedMediaDraft(file: File): Promise<BundleMediaDraft> {
  const url = URL.createObjectURL(file);
  try {
    const dimensions = await imageDimensions(url);
    return {
      kind: "upload",
      file,
      image: { url, altText: file.name, ...dimensions },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The selected image could not be read."));
    image.src = url;
  });
}
