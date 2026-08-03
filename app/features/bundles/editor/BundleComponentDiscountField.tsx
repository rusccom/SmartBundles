export interface BundleComponentDiscountFieldProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

const DYNAMIC_ONLY = "Component discounts are available with dynamic pricing.";

export function BundleComponentDiscountField(props: BundleComponentDiscountFieldProps) {
  const error = props.disabled ? undefined : discountError(props.value);
  return <span className="sb-discount-field" title={props.disabled ? DYNAMIC_ONLY : undefined}>
    <s-number-field label="Discount" suffix="%" value={props.value}
      min={0} max={100} step={0.01} disabled={props.disabled} error={error}
      onInput={(event) => props.onChange(event.currentTarget.value)} />
  </span>;
}

function discountError(value: string): string | undefined {
  if (/^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100) return undefined;
  return "Use 0–100";
}
