export interface BundleComponentQuantityFieldProps {
  quantity: number;
  onChange: (quantity: number) => void;
}

export function BundleComponentQuantityField({ quantity, onChange }: BundleComponentQuantityFieldProps) {
  return <label className="sb-quantity-field">Quantity
    <input type="number" min="1" max="2000" step="1" value={quantity}
      onChange={(event) => onChange(normalizeQuantity(event.target.valueAsNumber))} />
  </label>;
}

function normalizeQuantity(value: number): number {
  if (!Number.isSafeInteger(value)) return 1;
  return Math.min(2000, Math.max(1, value));
}
