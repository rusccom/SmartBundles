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
  return <label className="sb-option">
    <input type="checkbox" checked={option.allowed} disabled={disabled} onChange={() => props.onToggle(option.id)} />
    <span className="sb-option-title">{option.title}
      {soldOut ? <span className="sb-option-sold-out">Sold out</span> : null}
    </span>
    <span className="sb-option-price">{formatEditorLinePrice(
      option.unitPrice, 1, props.currencyCode, props.locale, props.discountPercent)}</span>
  </label>;
}
