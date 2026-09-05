import { formatEditorPriceRange } from "./bundle-editor-price";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentHeadingProps {
  selector: EditorSelector;
  currencyCode: string;
  locale: string;
}

export function BundleComponentHeading(props: BundleComponentHeadingProps) {
  const options = props.selector.options.filter(({ allowed }) => allowed);
  return <div className="sb-component-heading">
    <strong className="sb-component-title">{props.selector.productTitle}</strong>
    <span className="sb-component-price">{formatEditorPriceRange(
      options, props.selector.quantity, props.currencyCode, props.locale, props.selector.discountPercent)}</span>
  </div>;
}
