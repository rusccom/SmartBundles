import type { EditorOption } from "./editor.types";
import { formatEditorPrice } from "./bundle-editor-price";

export interface BundleVariantOptionRowProps {
  option: EditorOption;
  currencyCode: string;
  locale: string;
  onToggle: (id: string) => void;
}

export function BundleVariantOptionRow({ option, currencyCode, locale, onToggle }: BundleVariantOptionRowProps) {
  const soldOut = option.available === false;
  const disabled = soldOut && !option.allowed;
  return <label className="sb-option">
    <input type="checkbox" checked={option.allowed} disabled={disabled} onChange={() => onToggle(option.id)} />
    <span className="sb-option-title">{option.title}
      {soldOut ? <span className="sb-option-sold-out">Sold out</span> : null}
    </span>
    <span className="sb-option-price">{formatEditorPrice(option.unitPrice, currencyCode, locale)}</span>
  </label>;
}
