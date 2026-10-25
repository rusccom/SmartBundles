import { BundleDiscountField } from "./BundleDiscountField";
import { BundleEditorSection } from "./BundleEditorSection";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundlePricingFieldsProps {
  currencyCode: string;
  controller: BundleEditorController;
}

const DYNAMIC_COLUMNS = '@container (inline-size >= 480px) "minmax(0, 1fr) minmax(112px, 1fr)", "minmax(0, 1fr)"';
const FIXED_COLUMNS = '@container (inline-size >= 560px) "minmax(0, 2fr) repeat(2, minmax(112px, 1fr))", "minmax(0, 1fr)"';

export function BundlePricingFields(props: BundlePricingFieldsProps) {
  const { controller } = props, { draft, errors } = controller;
  return <BundleEditorSection heading="Price">
    <s-grid gap="base" alignItems="start"
      gridTemplateColumns={draft.pricingMode === "FIXED" ? FIXED_COLUMNS : DYNAMIC_COLUMNS}>
      {pricingModeControl(controller)}
      {draft.pricingMode === "FIXED" ? fixedPriceControl(props) : null}
      <BundleDiscountField value={draft.discountPercent} error={errors.discountPercent}
        onChange={(discountPercent) => controller.patch({ discountPercent })} />
    </s-grid>
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

