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
    <span className="sb-component-title"><s-text type="strong">{props.selector.productTitle}</s-text></span>
    <s-number color="subdued">{formatEditorPriceRange(
      options, props.selector.quantity, props.currencyCode, props.locale, props.selector.discountPercent)}</s-number>
  </div>;
}
