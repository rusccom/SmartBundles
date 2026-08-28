import type { ShopifyProductImage } from "../content/content.types";
import { BUNDLE_IMAGE_ACCEPT } from "./bundle-media-upload.client";
import { BUNDLE_MEDIA_PICKER_ID, BundleMediaPickerModal } from "./BundleMediaPickerModal";
import type { BundleEditorController } from "./useBundleEditorController";
import { useBundleMediaField } from "./useBundleMediaField";

export interface BundleMediaFieldProps {
  controller: BundleEditorController;
}

export function BundleMediaField({ controller }: BundleMediaFieldProps) {
  const field = useBundleMediaField(controller);
  return <div className="sb-media-field">
    {mediaHeading(controller, field.candidates.length)}
    <s-drop-zone accept={BUNDLE_IMAGE_ACCEPT} disabled={controller.busy}
      accessibilityLabel="Upload bundle product image" error={field.error ?? controller.errors.media}
      onChange={(event) => void field.selectFile(event.currentTarget.files[0])}>
      {dropContent(field.media.image)}
    </s-drop-zone>
    {field.media.image ? <div className="sb-media-actions">
      <s-button variant="tertiary" tone="critical" disabled={controller.busy}
        onClick={() => controller.patch({ media: { kind: "remove", image: null } })}>Remove</s-button>
    </div> : null}
    <BundleMediaPickerModal candidates={field.candidates} selectedUrl={field.media.image?.url}
      onSelect={field.selectCandidate} />
  </div>;
}

function mediaHeading(controller: BundleEditorController, candidateCount: number) {
  return <div className="sb-media-heading">
    <span className="sb-media-label">Media</span>
    <s-button variant="tertiary" command="--show" commandFor={BUNDLE_MEDIA_PICKER_ID}
      disabled={controller.busy || candidateCount === 0}>Choose from products</s-button>
  </div>;
}

function dropContent(image: ShopifyProductImage | null) {
  return <div className={`sb-media-drop-content${image ? " sb-media-drop-content-filled" : ""}`}>
    {image
      ? <img className="sb-media-preview" src={image.url} alt={image.altText ?? ""} />
      : <span className="sb-media-empty"><s-icon type="image" /> Add image</span>}
  </div>;
}
