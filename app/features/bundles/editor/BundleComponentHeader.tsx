import { BundleProductThumbnail } from "./BundleProductThumbnail";
import { formatEditorPriceRange } from "./bundle-editor-price";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentHeaderProps {
  selector: EditorSelector;
  expanded: boolean;
  detailsId: string;
  selectedCount: number;
  currencyCode: string;
  locale: string;
  dragHandle: React.ReactNode;
  onToggle: () => void;
}

export function BundleComponentHeader(props: BundleComponentHeaderProps) {
  const imageUrl = props.selector.options.find((option) => option.imageUrl)?.imageUrl;
  const summaryTone = props.selectedCount ? "" : " sb-component-summary-critical";
  return <header className="sb-component-header">
    {props.dragHandle}
    <button type="button" className="sb-disclosure" aria-expanded={props.expanded} aria-controls={props.detailsId}
      aria-label={`${props.expanded ? "Collapse" : "Expand"} ${props.selector.productTitle}`} onClick={props.onToggle}>
      <span className="sb-disclosure-icon" aria-hidden="true">{props.expanded ? "−" : "+"}</span></button>
    <BundleProductThumbnail imageUrl={imageUrl} title={props.selector.productTitle} />
    <strong className="sb-component-title">{props.selector.productTitle}</strong>
    <span className="sb-component-meta"><span className={`sb-component-summary${summaryTone}`} aria-live="polite">
      {props.selectedCount} / {props.selector.options.length} selected</span>
      <span className="sb-component-quantity">×{props.selector.quantity}</span>
      <span className="sb-component-price">{formatEditorPriceRange(
        props.selector.options.filter(({ allowed }) => allowed), props.selector.quantity,
        props.currencyCode, props.locale)}</span>
    </span>
  </header>;
}
