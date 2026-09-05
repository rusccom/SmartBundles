import { BundleStatusSelect } from "./BundleStatusSelect";
import { BundleEditorSection } from "./BundleEditorSection";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleStatusPanelProps {
  controller: BundleEditorController;
}

export function BundleStatusPanel({ controller }: BundleStatusPanelProps) {
  const { draft, errors } = controller;
  return <BundleEditorSection heading="Status">
    <BundleStatusSelect value={draft.desiredStatus} disabled={controller.busy}
      error={errors.desiredStatus}
      onChange={(desiredStatus) => controller.patch({ desiredStatus })} />
  </BundleEditorSection>;
}
