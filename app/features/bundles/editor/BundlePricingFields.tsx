import { useState } from "react";
import type { BundleEditorInitial } from "./editor.types";

export interface BundlePricingFieldsProps {
  initial: BundleEditorInitial;
  fixedPriceError?: string;
  modeError?: string;
}

export function BundlePricingFields({ initial, fixedPriceError, modeError }: BundlePricingFieldsProps) {
  const [mode, setMode] = useState(initial.pricingMode); const [fixedPrice, setFixedPrice] = useState(initial.fixedPrice);
  return <div className="sb-pricing-fields">
    <label className="sb-editor-field">Pricing mode
      <select name="pricingMode" value={mode}
        aria-invalid={Boolean(modeError)}
        onChange={(event) => setMode(event.target.value as typeof mode)}>
        <option value="FIXED">Fixed bundle price</option>
        <option value="DYNAMIC">Sum selected component prices</option>
      </select>
      {modeError ? <span className="sb-editor-field-error" role="alert">{modeError}</span> : null}
    </label>
    {mode === "FIXED" ? <label className="sb-editor-field">Bundle price ({initial.currencyCode})
      <input type="number" name="fixedPrice" value={fixedPrice} min="0.01" step="0.01" required
        aria-invalid={Boolean(fixedPriceError)} onChange={(event) => setFixedPrice(event.target.value)} />
      {fixedPriceError ? <span className="sb-editor-field-error" role="alert">{fixedPriceError}</span> : null}
    </label> : null}
    <s-paragraph>{pricingDescription(mode)}</s-paragraph>
  </div>;
}

function pricingDescription(mode: BundleEditorInitial["pricingMode"]): string {
  if (mode === "FIXED") return "Selections do not change the customer total.";
  return "Uses catalog prices in the store currency and Shopify's active currency rate; market price lists aren't applied.";
}
