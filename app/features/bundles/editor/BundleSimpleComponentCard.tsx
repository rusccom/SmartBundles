import { BundleComponentRemoveAction } from "./BundleComponentRemoveAction";
import { BundleProductThumbnail } from "./BundleProductThumbnail";
import { BundleComponentControls } from "./BundleComponentControls";
import { formatEditorLinePrice } from "./bundle-editor-price";
import type { EditorSelector } from "./editor.types";

export interface BundleSimpleComponentCardProps {
  selector: EditorSelector;
  index: number;
  currencyCode: string;
  locale: string;
  dragHandle: React.ReactNode;
  discountDisabled: boolean;
  onQuantity: (index: number, quantity: number) => void;
  onDiscount: (index: number, discountPercent: string) => void;
  onRemove: (index: number) => void;
}

export function BundleSimpleComponentCard(props: BundleSimpleComponentCardProps) {
  const option = props.selector.options[0];
  if (!option) return null;
  return <div className="sb-simple-component">
    {props.dragHandle}
    <BundleProductThumbnail imageUrl={option.imageUrl} title={props.selector.productTitle} />
    <span className="sb-simple-component-info"><strong>{props.selector.productTitle}</strong>
      {option.available === false
        ? <s-badge tone="warning">Sold out</s-badge>
        : <s-badge>Available</s-badge>}</span>
    <BundleComponentControls selector={props.selector} discountDisabled={props.discountDisabled}
      onQuantity={(value) => props.onQuantity(props.index, value)}
      onDiscount={(value) => props.onDiscount(props.index, value)} />
    <span className="sb-simple-component-price">{formatEditorLinePrice(
      option.unitPrice, props.selector.quantity, props.currencyCode, props.locale,
      props.selector.discountPercent)}</span>
    <BundleComponentRemoveAction index={props.index} productTitle={props.selector.productTitle}
      onRemove={props.onRemove} />
  </div>;
}
