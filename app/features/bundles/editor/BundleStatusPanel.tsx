import { BundleStatusSelect } from "./BundleStatusSelect";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleStatusPanelProps {
  controller: BundleEditorController;
}

export function BundleStatusPanel({ controller }: BundleStatusPanelProps) {
  const { draft, errors } = controller;
  return <s-section>
    <s-stack direction="block" gap="base">
      <s-heading>Status</s-heading>
      <BundleStatusSelect value={draft.desiredStatus} disabled={controller.busy}
        error={errors.desiredStatus}
        onChange={(desiredStatus) => controller.patch({ desiredStatus })} />
    </s-stack>
  </s-section>;
}
