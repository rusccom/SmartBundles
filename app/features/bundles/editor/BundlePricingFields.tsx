import { BundleDiscountField } from "./BundleDiscountField";
import { BundleEditorSection } from "./BundleEditorSection";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundlePricingFieldsProps {
  currencyCode: string;
  controller: BundleEditorController;
}

export function BundlePricingFields(props: BundlePricingFieldsProps) {
  const { controller } = props, { draft, errors } = controller;
  return <BundleEditorSection heading="Price">
    {pricingModeControl(controller)}
    {draft.pricingMode === "FIXED" ? fixedPriceControl(props) : null}
    <BundleDiscountField value={draft.discountPercent} error={errors.discountPercent}
      onChange={(discountPercent) => controller.patch({ discountPercent })} />
    <s-paragraph>{pricingDescription(draft.pricingMode)}</s-paragraph>
  </BundleEditorSection>;
}

function pricingModeControl(controller: BundleEditorController) {
  const { draft, errors } = controller;
  return <s-select label="Pricing mode" value={draft.pricingMode} error={errors.pricingMode}
    onChange={(event) => controller.changePricingMode(
      event.currentTarget.value as typeof draft.pricingMode)}>
    <s-option value="FIXED">Fixed bundle price</s-option>
    <s-option value="DYNAMIC">Sum selected component prices</s-option>
  </s-select>;
}

function fixedPriceControl(props: BundlePricingFieldsProps) {
  const { controller } = props, { draft, errors } = controller;
  return <s-money-field label={`Bundle price (${props.currencyCode})`} value={draft.fixedPrice}
    min={0.01} error={errors.fixedPrice}
    onInput={(event) => controller.patch({ fixedPrice: event.currentTarget.value })} />;
}

function pricingDescription(mode: "FIXED" | "DYNAMIC"): string {
  if (mode === "FIXED") return "Selections do not change the customer total. Component discounts require dynamic pricing.";
  return "Uses catalog prices in the store currency and Shopify's active currency rate; market price lists aren't applied.";
}
