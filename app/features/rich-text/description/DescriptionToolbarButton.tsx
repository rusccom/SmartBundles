import type { ReactNode } from "react";

export interface DescriptionToolbarButtonProps {
  label: string;
  content: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function DescriptionToolbarButton({ label, content, pressed, disabled, onPress }: DescriptionToolbarButtonProps) {
  return <button
    type="button"
    className="sb-description-tool"
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    disabled={disabled}
    onClick={onPress}
  >{content}</button>;
}
