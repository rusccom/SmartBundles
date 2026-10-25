import { isSimpleBundleComponent } from "./bundle-component-presentation";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentMetaProps {
  selector: EditorSelector;
  modalId: string;
}

export function BundleComponentMeta(props: BundleComponentMetaProps) {
  const selectedCount = props.selector.options.filter(({ allowed }) => allowed).length;
  if (isSimpleBundleComponent(props.selector)) return <span className="sb-component-meta">
    {props.selector.options[0].available === false
      ? <s-badge tone="warning">Sold out</s-badge> : <s-badge>Available</s-badge>}
  </span>;
  return <span className="sb-component-meta">
    <span aria-live="polite"
      aria-label={`${selectedCount} of ${props.selector.options.length} variants selected`}>
      <s-number tone={selectedCount ? "auto" : "critical"}>
        {selectedCount} / {props.selector.options.length}
      </s-number>
    </span>
    <s-button command="--show" commandFor={props.modalId}
      accessibilityLabel={`Choose variants for ${props.selector.productTitle}`}>Variants</s-button>
  </span>;
}
