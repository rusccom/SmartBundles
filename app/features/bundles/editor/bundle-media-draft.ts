import type { BundleMediaDraft } from "./bundle-media.types";

export function appendBundleMedia(
  form: FormData,
  baseline: BundleMediaDraft,
  draft: BundleMediaDraft,
): void {
  if (mediaDraftFingerprint(baseline) === mediaDraftFingerprint(draft)) return;
  form.set("mediaAction", draft.kind);
  if (draft.kind === "component") form.set("mediaProductId", draft.productId);
  if (draft.kind === "upload") form.set("mediaFile", draft.file, draft.file.name);
}

export function mediaDraftFingerprint(media: BundleMediaDraft): string {
  const file = media.kind === "upload" ? fileFingerprint(media.file) : undefined;
  const productId = media.kind === "component" ? media.productId : undefined;
  return JSON.stringify({ kind: media.kind, image: media.image, file, productId });
}

function fileFingerprint(file: File): string {
  return [file.name, file.size, file.type, file.lastModified].join(":");
}
