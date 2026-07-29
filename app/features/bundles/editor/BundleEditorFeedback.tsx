import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleEditorFeedbackProps {
  controller: BundleEditorController;
}

export function BundleEditorFeedback({ controller }: BundleEditorFeedbackProps) {
  if (!controller.message) return null;
  return <s-banner tone={controller.messageTone}>
    <s-paragraph>{controller.message}</s-paragraph>
  </s-banner>;
}
