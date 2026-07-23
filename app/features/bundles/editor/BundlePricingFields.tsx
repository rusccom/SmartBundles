import { BundleDiscountField } from "./BundleDiscountField";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundlePricingFieldsProps {
  currencyCode: string;
  controller: BundleEditorController;
}

export function BundlePricingFields(props: BundlePricingFieldsProps) {
  const { controller } = props, { draft, errors } = controller;
  return <s-section heading="Price"><div className="sb-pricing-fields">
    {pricingModeControl(controller)}
    {draft.pricingMode === "FIXED" ? fixedPriceControl(props) : null}
    <BundleDiscountField value={draft.discountPercent} error={errors.discountPercent}
      onChange={(discountPercent) => controller.patch({ discountPercent })} />
    <s-paragraph>{pricingDescription(draft.pricingMode)}</s-paragraph>
  </div></s-section>;
}

function pricingModeControl(controller: BundleEditorController) {
  const { draft, errors } = controller;
  return <label className="sb-editor-field">Pricing mode
    <select value={draft.pricingMode} aria-invalid={Boolean(errors.pricingMode)}
      onChange={(event) => controller.changePricingMode(
        event.target.value as typeof draft.pricingMode)}>
      <option value="FIXED">Fixed bundle price</option>
      <option value="DYNAMIC">Sum selected component prices</option>
    </select>
    {errors.pricingMode
      ? <span className="sb-editor-field-error" role="alert">{errors.pricingMode}</span>
      : null}
  </label>;
}

function fixedPriceControl(props: BundlePricingFieldsProps) {
  const { controller } = props, { draft, errors } = controller;
  return <label className="sb-editor-field">Bundle price ({props.currencyCode})
    <input type="number" value={draft.fixedPrice} min="0.01" step="0.01" required
      aria-invalid={Boolean(errors.fixedPrice)}
      onChange={(event) => controller.patch({ fixedPrice: event.target.value })} />
    {errors.fixedPrice
      ? <span className="sb-editor-field-error" role="alert">{errors.fixedPrice}</span>
      : null}
  </label>;
}

function pricingDescription(mode: "FIXED" | "DYNAMIC"): string {
  if (mode === "FIXED") return "Selections do not change the customer total. Component discounts require dynamic pricing.";
  return "Uses catalog prices in the store currency and Shopify's active currency rate; market price lists aren't applied.";
}
