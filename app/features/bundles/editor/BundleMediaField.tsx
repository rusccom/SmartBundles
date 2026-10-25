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
  return <s-stack gap="small">
    {mediaHeading(controller, field.candidates.length)}
    <s-drop-zone accept={BUNDLE_IMAGE_ACCEPT} disabled={controller.busy}
      accessibilityLabel="Upload bundle product image" error={field.error ?? controller.errors.media}
      onDropRejected={() => field.setError("Choose a JPG, PNG, WebP, or GIF image up to 10 MB.")}
      onChange={(event) => void field.selectFile(event.currentTarget.files[0])}>
      {dropContent(field.media.image)}
    </s-drop-zone>
    {field.media.image ? <s-stack direction="inline" justifyContent="end">
      <s-button variant="tertiary" disabled={controller.busy}
        onClick={() => controller.patch({ media: { kind: "remove", image: null } })}>Remove</s-button>
    </s-stack> : null}
    <BundleMediaPickerModal candidates={field.candidates} selectedUrl={field.media.image?.url}
      onSelect={field.selectCandidate} />
  </s-stack>;
}

function mediaHeading(controller: BundleEditorController, candidateCount: number) {
  return <s-stack direction="inline" alignItems="center" justifyContent="space-between" gap="small">
    <s-text type="strong">Media</s-text>
    <s-button variant="tertiary" command="--show" commandFor={BUNDLE_MEDIA_PICKER_ID}
      disabled={controller.busy || candidateCount === 0}>Choose from products</s-button>
  </s-stack>;
}

function dropContent(image: ShopifyProductImage | null) {
  return <div className={`sb-media-drop-content${image ? " sb-media-drop-content-filled" : ""}`}>
    {image
      ? <s-image src={image.url} alt={image.altText ?? "Bundle product image"} objectFit="contain" aspectRatio="1.6" />
      : <s-stack gap="small" alignItems="center"><s-icon type="image" /><s-text>Add image</s-text>
        <s-text color="subdued">JPG, PNG, WebP or GIF, up to 10 MB</s-text></s-stack>}
  </div>;
}
