import type { BundleComponentCardProps } from "./BundleComponentCard";
import { BundleComponentControls } from "./BundleComponentControls";
import { BundleComponentHeading } from "./BundleComponentHeading";
import { BundleComponentRemoveAction } from "./BundleComponentRemoveAction";
import { BundleProductThumbnail } from "./BundleProductThumbnail";

export interface BundleComponentHeaderProps extends BundleComponentCardProps {
  modalId: string;
  dragHandle: React.ReactNode;
}

export function BundleComponentHeader(props: BundleComponentHeaderProps) {
  const imageUrl = props.selector.productImageUrl
    ?? props.selector.options.find((option) => option.imageUrl)?.imageUrl;
  return <header className="sb-component-header">
    {props.dragHandle}
    <div className="sb-component-image">
      <BundleProductThumbnail imageUrl={imageUrl} title={props.selector.productTitle} />
    </div>
    <BundleComponentHeading selector={props.selector} currencyCode={props.currencyCode} locale={props.locale} />
    <BundleComponentControls selector={props.selector} modalId={props.modalId} discountDisabled={props.discountDisabled}
      onQuantity={(value) => props.onQuantity(props.index, value)}
      onDiscount={(value) => props.onDiscount(props.index, value)} />
    <BundleComponentRemoveAction index={props.index} productTitle={props.selector.productTitle}
      onRemove={props.onRemove} />
  </header>;
}
