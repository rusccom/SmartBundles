import type { ReactNode } from "react";

export interface BundleEditorSectionProps {
  heading: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function BundleEditorSection(props: BundleEditorSectionProps) {
  return <s-section>
    <s-stack direction="block" gap="base">
      <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
        <s-heading>{props.heading}</s-heading>
        {props.actions}
      </s-stack>
      {props.children}
    </s-stack>
  </s-section>;
}
