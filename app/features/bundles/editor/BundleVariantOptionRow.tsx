import type { EditorOption } from "./editor.types";
import { formatEditorLinePrice } from "./bundle-editor-price";

export interface BundleVariantOptionRowProps {
  option: EditorOption;
  currencyCode: string;
  locale: string;
  discountPercent: string;
  onToggle: (id: string) => void;
}

export function BundleVariantOptionRow(props: BundleVariantOptionRowProps) {
  const { option } = props;
  const soldOut = option.available === false;
  const disabled = soldOut && !option.allowed;
  return <div className="sb-option">
    <s-checkbox label={option.title} checked={option.allowed} disabled={disabled}
      onChange={() => props.onToggle(option.id)} />
    {soldOut ? <s-badge tone="warning">Sold out</s-badge> : null}
    <span className="sb-option-price">{formatEditorLinePrice(
      option.unitPrice, 1, props.currencyCode, props.locale, props.discountPercent)}</span>
  </div>;
}
