import { DescriptionEditor } from "../../rich-text/description/DescriptionEditor";
import { BundleStatusSelect } from "./BundleStatusSelect";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleDetailsFieldsProps {
  controller: BundleEditorController;
}

export function BundleDetailsFields({ controller }: BundleDetailsFieldsProps) {
  const { draft, errors } = controller;
  return <s-section>
    <div className="sb-details-header">
      <s-heading>Details</s-heading>
      <BundleStatusSelect value={draft.desiredStatus} disabled={controller.busy}
        error={errors.desiredStatus}
        onChange={(desiredStatus) => controller.patch({ desiredStatus })} />
    </div>
    <s-stack direction="block" gap="base">
      <s-text-field label="Bundle title" value={draft.title} disabled={controller.busy}
        required error={errors.title}
        onInput={(event) => controller.patch({ title: event.currentTarget.value })} />
      {descriptionField(controller)}
      <s-paragraph>Title and description are loaded from and saved directly to Shopify.</s-paragraph>
    </s-stack>
  </s-section>;
}

function descriptionField(controller: BundleEditorController) {
  const { draft, errors } = controller;
  return <DescriptionEditor value={draft.descriptionHtml}
    disabled={controller.busy} error={errors.description}
    onChange={(descriptionHtml) => controller.patch({ descriptionHtml })} />;
}
