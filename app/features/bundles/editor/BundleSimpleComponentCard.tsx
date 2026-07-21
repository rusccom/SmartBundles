import { BundleComponentRemoveAction } from "./BundleComponentRemoveAction";
import { BundleProductThumbnail } from "./BundleProductThumbnail";
import { formatEditorPrice } from "./bundle-editor-price";
import type { EditorSelector } from "./editor.types";

export interface BundleSimpleComponentCardProps {
  selector: EditorSelector;
  index: number;
  currencyCode: string;
  locale: string;
  dragHandle: React.ReactNode;
  onRemove: (index: number) => void;
}

export function BundleSimpleComponentCard(props: BundleSimpleComponentCardProps) {
  const option = props.selector.options[0];
  if (!option) return null;
  const status = option.available === false ? "Sold out" : "Available";
  const statusClass = option.available === false ? " sb-simple-component-status-sold-out" : "";
  return <div className="sb-simple-component">
    {props.dragHandle}
    <BundleProductThumbnail imageUrl={option.imageUrl} title={props.selector.productTitle} />
    <span className="sb-simple-component-info"><strong>{props.selector.productTitle}</strong>
      <span className={`sb-simple-component-status${statusClass}`}>{status}</span></span>
    <span className="sb-simple-component-price">{formatEditorPrice(option.displayPrice,
      props.currencyCode, props.locale)}</span>
    <BundleComponentRemoveAction index={props.index} productTitle={props.selector.productTitle}
      onRemove={props.onRemove} />
  </div>;
}
