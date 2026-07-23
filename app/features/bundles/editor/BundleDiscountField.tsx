export interface BundleDiscountFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function BundleDiscountField(props: BundleDiscountFieldProps) {
  return <label className="sb-editor-field">Discount (%)
    <input type="number" value={props.value} min="0" max="100" step="0.01" required
      aria-invalid={Boolean(props.error)}
      onChange={(event) => props.onChange(event.target.value)} />
    {props.error ? <span className="sb-editor-field-error" role="alert">{props.error}</span> : null}
  </label>;
}
