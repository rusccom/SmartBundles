import { useState } from "react";
import { bundleMediaCandidates } from "./bundle-media-candidates";
import type { BundleMediaCandidate } from "./bundle-media.types";
import { imageFileError, uploadedMediaDraft } from "./bundle-media-upload.client";
import type { BundleEditorController } from "./useBundleEditorController";
import { useBundleMediaObjectUrl } from "./useBundleMediaObjectUrl";

export function useBundleMediaField(controller: BundleEditorController) {
  const [error, setError] = useState<string>();
  const media = controller.draft.media;
  useBundleMediaObjectUrl(media);
  return {
    media, error, setError,
    candidates: bundleMediaCandidates(controller.draft.selectors),
    selectFile: fileSelection(controller, setError),
    selectCandidate: candidateSelection(controller, setError),
  };
}

function fileSelection(
  controller: BundleEditorController,
  setError: React.Dispatch<React.SetStateAction<string | undefined>>,
) {
  return async (file?: File) => {
    const error = imageFileError(file);
    setError(error);
    if (error || !file) return;
    try {
      controller.patch({ media: await uploadedMediaDraft(file) });
    } catch {
      setError("The selected image could not be read.");
    }
  };
}

function candidateSelection(
  controller: BundleEditorController,
  setError: React.Dispatch<React.SetStateAction<string | undefined>>,
) {
  return (candidate: BundleMediaCandidate) => {
    setError(undefined);
    controller.patch({ media: componentMedia(candidate) });
  };
}

function componentMedia(candidate: BundleMediaCandidate) {
  return {
    kind: "component" as const,
    productId: candidate.productId,
    image: { url: candidate.url, altText: candidate.title, width: 1, height: 1 },
  };
}
