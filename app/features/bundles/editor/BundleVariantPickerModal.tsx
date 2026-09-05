import type { BundleComponentCardProps } from "./BundleComponentCard";
import { BundleComponentDetails } from "./BundleComponentDetails";

export interface BundleVariantPickerModalProps extends BundleComponentCardProps {
  modalId: string;
}

export function BundleVariantPickerModal(props: BundleVariantPickerModalProps) {
  const selectedCount = props.selector.options.filter(({ allowed }) => allowed).length;
  const heading = `Variants · ${props.selector.productTitle}`;
  return <s-modal id={props.modalId} heading={heading} accessibilityLabel={heading} size="base">
    <div className="sb-variant-picker">
      <p className="sb-variant-picker-summary" aria-live="polite">
        {selectedCount} of {props.selector.options.length} variants selected. Select the variants customers can choose.
      </p>
      <BundleComponentDetails {...props} detailsId={`${props.modalId}-options`} />
    </div>
    <s-button slot="primary-action" variant="primary" command="--hide"
      commandFor={props.modalId} disabled={!selectedCount}>Done</s-button>
  </s-modal>;
}
