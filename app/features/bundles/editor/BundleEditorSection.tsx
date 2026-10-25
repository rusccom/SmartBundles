import type { ReactNode } from "react";

export interface BundleEditorSectionProps {
  heading: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function BundleEditorSection(props: BundleEditorSectionProps) {
  return <s-section heading={props.heading}>
    {props.actions}
    <s-stack direction="block" gap="base">
      {props.children}
    </s-stack>
  </s-section>;
}
