import { DescriptionEditor } from "../../rich-text/description/DescriptionEditor";
import { BundleMediaField } from "./BundleMediaField";
import { BundleEditorSection } from "./BundleEditorSection";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleDetailsFieldsProps {
  controller: BundleEditorController;
}

export function BundleDetailsFields({ controller }: BundleDetailsFieldsProps) {
  const { draft, errors } = controller;
  return <BundleEditorSection heading="Details">
    <s-text-field label="Bundle title" value={draft.title} disabled={controller.busy}
      required error={errors.title}
      onInput={(event) => controller.patch({ title: event.currentTarget.value })} />
    {descriptionField(controller)}
    <BundleMediaField controller={controller} />
  </BundleEditorSection>;
}

function descriptionField(controller: BundleEditorController) {
  const { draft, errors } = controller;
  return <DescriptionEditor value={draft.descriptionHtml}
    disabled={controller.busy} error={errors.description}
    onChange={(descriptionHtml) => controller.patch({ descriptionHtml })} />;
}
