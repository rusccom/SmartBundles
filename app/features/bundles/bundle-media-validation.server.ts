import type { BundleMediaSubmission } from "./bundle.types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function parseBundleMedia(
  form: FormData,
  errors: Record<string, string>,
): BundleMediaSubmission {
  const action = textValue(form, "mediaAction");
  if (!action || action === "keep") return { action: "keep" };
  if (action === "remove") return { action: "remove" };
  if (action === "component") return componentSubmission(form, errors);
  if (action === "upload") return uploadSubmission(form, errors);
  errors.media = "Choose a valid bundle image.";
  return { action: "keep" };
}

function componentSubmission(
  form: FormData,
  errors: Record<string, string>,
): BundleMediaSubmission {
  const productId = textValue(form, "mediaProductId");
  if (productId) return { action: "component", productId };
  errors.media = "Choose a Shopify product image.";
  return { action: "keep" };
}

function uploadSubmission(
  form: FormData,
  errors: Record<string, string>,
): BundleMediaSubmission {
  const value = form.get("mediaFile");
  if (!(value instanceof File) || value.size === 0) return invalidFile(errors);
  if (!IMAGE_TYPES.has(value.type)) return invalidType(errors);
  if (value.size > MAX_IMAGE_BYTES) return oversizedFile(errors);
  return { action: "upload", file: value };
}

function invalidFile(errors: Record<string, string>): BundleMediaSubmission {
  errors.media = "Choose an image file.";
  return { action: "keep" };
}

function invalidType(errors: Record<string, string>): BundleMediaSubmission {
  errors.media = "Choose a JPG, PNG, WebP, or GIF image.";
  return { action: "keep" };
}

function oversizedFile(errors: Record<string, string>): BundleMediaSubmission {
  errors.media = "The image must be 10 MB or smaller.";
  return { action: "keep" };
}

function textValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
