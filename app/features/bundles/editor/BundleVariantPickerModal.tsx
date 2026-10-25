import type { BundleComponentCardProps } from "./BundleComponentCard";
import { BundleComponentDetails } from "./BundleComponentDetails";
import { useBundleVariantSelection } from "./useBundleVariantSelection";

export interface BundleVariantPickerModalProps extends BundleComponentCardProps {
  modalId: string;
}

export function BundleVariantPickerModal(props: BundleVariantPickerModalProps) {
  const draft = useBundleVariantSelection(props.selector, (ids) => props.onOptions(props.index, ids));
  const heading = `Variants · ${props.selector.productTitle}`;
  return <s-modal id={props.modalId} heading={heading} accessibilityLabel={heading} size="base"
    onShow={draft.begin} onHide={draft.cancel}>
    <div className="sb-variant-picker">
      <s-paragraph color="subdued">
        {draft.selectedCount} of {props.selector.options.length} variants selected. Select the variants customers can choose.
      </s-paragraph>
      <BundleComponentDetails {...props} selector={draft.selector} onOption={draft.toggle} detailsId={`${props.modalId}-options`} />
    </div>
    <s-button slot="primary-action" variant="primary" command="--hide"
      commandFor={props.modalId} onClick={draft.confirm}>Done</s-button>
  </s-modal>;
}
