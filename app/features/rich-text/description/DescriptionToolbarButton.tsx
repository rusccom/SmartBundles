import type { ReactNode } from "react";

export interface DescriptionToolbarButtonProps {
  label: string;
  content: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function DescriptionToolbarButton({ label, content, pressed, disabled, onPress }: DescriptionToolbarButtonProps) {
  if (pressed !== undefined) return <s-press-button variant="tertiary"
    accessibilityLabel={label} pressed={pressed} disabled={disabled} onClick={onPress}>
    {content}
  </s-press-button>;
  return <s-button variant="tertiary" accessibilityLabel={label} disabled={disabled} onClick={onPress}>
    {content}
  </s-button>;
}
