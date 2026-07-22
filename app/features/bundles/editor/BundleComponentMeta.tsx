import { formatEditorPriceRange } from "./bundle-editor-price";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentMetaProps {
  selector: EditorSelector;
  selectedCount: number;
  currencyCode: string;
  locale: string;
}

export function BundleComponentMeta(props: BundleComponentMetaProps) {
  const summaryTone = props.selectedCount ? "" : " sb-component-summary-critical";
  const options = props.selector.options.filter(({ allowed }) => allowed);
  return <span className="sb-component-meta">
    <span className={`sb-component-summary${summaryTone}`} aria-live="polite">
      {props.selectedCount} / {props.selector.options.length} selected
    </span>
    <span className="sb-component-quantity">×{props.selector.quantity}</span>
    <span className="sb-component-price">{formatEditorPriceRange(
      options, props.selector.quantity, props.currencyCode, props.locale, props.selector.discountPercent)}</span>
  </span>;
}
