import { useState } from "react";
import type { BundleEditorInitial } from "./editor.types";
import { BundleDiscountField } from "./BundleDiscountField";

export interface BundlePricingFieldsProps {
  initial: BundleEditorInitial;
  mode: BundleEditorInitial["pricingMode"];
  onModeChange: (mode: BundleEditorInitial["pricingMode"]) => void;
  fixedPriceError?: string;
  modeError?: string;
  discountError?: string;
}

export function BundlePricingFields(props: BundlePricingFieldsProps) {
  const [fixedPrice, setFixedPrice] = useState(props.initial.fixedPrice);
  return <s-section heading="Price"><div className="sb-pricing-fields">
      <label className="sb-editor-field">Pricing mode
        <select name="pricingMode" value={props.mode} aria-invalid={Boolean(props.modeError)}
          onChange={(event) => props.onModeChange(event.target.value as typeof props.mode)}>
          <option value="FIXED">Fixed bundle price</option>
          <option value="DYNAMIC">Sum selected component prices</option>
        </select>
        {props.modeError ? <span className="sb-editor-field-error" role="alert">{props.modeError}</span> : null}
      </label>
      {props.mode === "FIXED" ? <label className="sb-editor-field">Bundle price ({props.initial.currencyCode})
        <input type="number" name="fixedPrice" value={fixedPrice} min="0.01" step="0.01" required
          aria-invalid={Boolean(props.fixedPriceError)} onChange={(event) => setFixedPrice(event.target.value)} />
        {props.fixedPriceError ? <span className="sb-editor-field-error" role="alert">{props.fixedPriceError}</span> : null}
      </label> : null}
      <BundleDiscountField initialValue={props.initial.discountPercent} error={props.discountError} />
      <s-paragraph>{pricingDescription(props.mode)}</s-paragraph>
    </div></s-section>;
}

function pricingDescription(mode: BundleEditorInitial["pricingMode"]): string {
  if (mode === "FIXED") return "Selections do not change the customer total. Component discounts require dynamic pricing.";
  return "Uses catalog prices in the store currency and Shopify's active currency rate; market price lists aren't applied.";
}
