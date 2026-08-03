export interface BundleDiscountFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function BundleDiscountField(props: BundleDiscountFieldProps) {
  return <s-number-field label="Discount" suffix="%" value={props.value}
    min={0} max={100} step={0.01} error={props.error}
    onInput={(event) => props.onChange(event.currentTarget.value)} />;
}
