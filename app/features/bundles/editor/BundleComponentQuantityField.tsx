export interface BundleComponentQuantityFieldProps {
  quantity: number;
  onChange: (quantity: number) => void;
}

export function BundleComponentQuantityField({ quantity, onChange }: BundleComponentQuantityFieldProps) {
  return <span className="sb-quantity-field">
    <s-number-field label="Quantity" value={String(quantity)} min={1} max={2000} step={1}
      onInput={(event) => onChange(normalizeQuantity(Number(event.currentTarget.value)))} />
  </span>;
}

function normalizeQuantity(value: number): number {
  if (!Number.isSafeInteger(value)) return 1;
  return Math.min(2000, Math.max(1, value));
}
