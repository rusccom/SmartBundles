import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleEditorFeedbackProps {
  controller: BundleEditorController;
}

export function BundleEditorFeedback({ controller }: BundleEditorFeedbackProps) {
  if (!controller.message) return null;
  return <s-banner tone={controller.messageTone}>
    <s-stack direction="block" gap="base">
      <s-paragraph>{controller.message}</s-paragraph>
      {controller.uncertain
        ? <s-button onClick={controller.reload}>Reload and verify</s-button>
        : null}
    </s-stack>
  </s-banner>;
}
