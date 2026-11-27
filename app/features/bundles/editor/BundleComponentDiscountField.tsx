export interface BundleComponentDiscountFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function BundleComponentDiscountField(props: BundleComponentDiscountFieldProps) {
  return <span className="sb-discount-field">
    <span aria-hidden="true"><s-text>Discount</s-text></span>
    <s-number-field label="Discount" labelAccessibilityVisibility="exclusive" suffix="%" value={props.value}
      min={0} max={100} step={0.01} error={discountError(props.value)}
      onInput={(event) => props.onChange(event.currentTarget.value)} />
  </span>;
}

function discountError(value: string): string | undefined {
  if (/^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100) return undefined;
  return "Use 0–100";
}
