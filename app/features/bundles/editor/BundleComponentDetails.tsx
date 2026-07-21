import { BundleComponentActions } from "./BundleComponentActions";
import type { BundleComponentCardProps } from "./BundleComponentCard";
import { BundleVariantOptionRow } from "./BundleVariantOptionRow";

export interface BundleComponentDetailsProps extends BundleComponentCardProps {
  detailsId: string;
}

export function BundleComponentDetails(props: BundleComponentDetailsProps) {
  const selectedCount = props.selector.options.filter(({ allowed }) => allowed).length;
  const errorId = `${props.detailsId}-error`;
  return <div id={props.detailsId} className="sb-component-details">
    <label className="sb-component-label">Customer-facing label
      <input value={props.selector.label} onChange={(event) => props.onLabel(props.index, event.currentTarget.value)} />
    </label>
    <fieldset className="sb-component-options" aria-describedby={selectedCount ? undefined : errorId}>
      <legend>Allowed variants</legend>
      {props.selector.options.map((option) => <BundleVariantOptionRow key={option.id} option={option}
        currencyCode={props.currencyCode} locale={props.locale}
        onToggle={(id) => props.onOption(props.index, id)} />)}
    </fieldset>
    {selectedCount === 0 ? <p id={errorId} className="sb-component-inline-error" role="alert">
      Select at least one available variant.
    </p> : null}
    <BundleComponentActions index={props.index} total={props.total} productTitle={props.selector.productTitle}
      onMove={props.onMove} onRemove={props.onRemove} />
  </div>;
}
