import type { BundleDesiredStatus } from "../bundle.types";

export interface BundleStatusSelectProps {
  value: BundleDesiredStatus;
  disabled: boolean;
  error?: string;
  onChange: (value: BundleDesiredStatus) => void;
}

export function BundleStatusSelect(props: BundleStatusSelectProps) {
  return <div className="sb-status-select">
    <s-select label="Status" labelAccessibilityVisibility="exclusive" value={props.value}
      disabled={props.disabled} error={props.error}
      onChange={(event) => props.onChange(event.currentTarget.value as BundleDesiredStatus)}>
      <s-option value="ACTIVE">Active</s-option>
      <s-option value="DRAFT">Draft</s-option>
    </s-select>
  </div>;
}
