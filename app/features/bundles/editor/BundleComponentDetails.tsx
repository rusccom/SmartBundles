import type { BundleComponentCardProps } from "./BundleComponentCard";
import { BundleComponentRemoveAction } from "./BundleComponentRemoveAction";
import { BundleVariantOptionRow } from "./BundleVariantOptionRow";
import { BundleComponentQuantityField } from "./BundleComponentQuantityField";

export interface BundleComponentDetailsProps extends BundleComponentCardProps {
  detailsId: string;
}

export function BundleComponentDetails(props: BundleComponentDetailsProps) {
  const selectedCount = props.selector.options.filter(({ allowed }) => allowed).length;
  const errorId = `${props.detailsId}-error`;
  return <div id={props.detailsId} className="sb-component-details">
    <div className="sb-component-settings">
      <BundleComponentQuantityField quantity={props.selector.quantity}
        onChange={(quantity) => props.onQuantity(props.index, quantity)} />
    </div>
    <fieldset className="sb-component-options" aria-describedby={selectedCount ? undefined : errorId}>
      <legend>Allowed variants</legend>
      {props.selector.options.map((option) => <BundleVariantOptionRow key={option.id} option={option}
        currencyCode={props.currencyCode} locale={props.locale}
        onToggle={(id) => props.onOption(props.index, id)} />)}
    </fieldset>
    {selectedCount === 0 ? <p id={errorId} className="sb-component-inline-error" role="alert">
      Select at least one available variant.
    </p> : null}
    <BundleComponentRemoveAction index={props.index} productTitle={props.selector.productTitle} onRemove={props.onRemove} />
  </div>;
}
