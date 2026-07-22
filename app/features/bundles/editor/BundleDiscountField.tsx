export interface BundleDiscountFieldProps {
  initialValue: string;
  error?: string;
}

export function BundleDiscountField({ initialValue, error }: BundleDiscountFieldProps) {
  return <label className="sb-editor-field">Discount (%)
    <input type="number" name="discountPercent" defaultValue={initialValue}
      min="0" max="100" step="0.01" required aria-invalid={Boolean(error)} />
    {error ? <span className="sb-editor-field-error" role="alert">{error}</span> : null}
  </label>;
}
