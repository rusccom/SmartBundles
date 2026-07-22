import type { BundleComponentCardProps } from "./BundleComponentCard";
import { BundleComponentControls } from "./BundleComponentControls";
import { BundleComponentMeta } from "./BundleComponentMeta";
import { BundleComponentRemoveAction } from "./BundleComponentRemoveAction";
import { BundleProductThumbnail } from "./BundleProductThumbnail";

export interface BundleComponentHeaderProps extends BundleComponentCardProps {
  expanded: boolean;
  detailsId: string;
  selectedCount: number;
  dragHandle: React.ReactNode;
  onToggle: () => void;
}

export function BundleComponentHeader(props: BundleComponentHeaderProps) {
  const imageUrl = props.selector.options.find((option) => option.imageUrl)?.imageUrl;
  return <header className="sb-component-header">
    {props.dragHandle}
    <button type="button" className="sb-disclosure" aria-expanded={props.expanded} aria-controls={props.detailsId}
      aria-label={`${props.expanded ? "Collapse" : "Expand"} ${props.selector.productTitle}`} onClick={props.onToggle}>
      <span className="sb-disclosure-icon" aria-hidden="true">{props.expanded ? "−" : "+"}</span></button>
    <BundleProductThumbnail imageUrl={imageUrl} title={props.selector.productTitle} />
    <strong className="sb-component-title">{props.selector.productTitle}</strong>
    <BundleComponentControls selector={props.selector} discountDisabled={props.discountDisabled}
      onQuantity={(value) => props.onQuantity(props.index, value)}
      onDiscount={(value) => props.onDiscount(props.index, value)} />
    <BundleComponentMeta selector={props.selector} selectedCount={props.selectedCount}
      currencyCode={props.currencyCode} locale={props.locale} />
    <BundleComponentRemoveAction index={props.index} productTitle={props.selector.productTitle}
      onRemove={props.onRemove} />
  </header>;
}
