import { isSimpleBundleComponent } from "./bundle-component-presentation";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentMetaProps {
  selector: EditorSelector;
  modalId: string;
}

export function BundleComponentMeta(props: BundleComponentMetaProps) {
  const selectedCount = props.selector.options.filter(({ allowed }) => allowed).length;
  if (!props.selector.options.length) return <s-badge tone="critical">No variants available</s-badge>;
  if (isSimpleBundleComponent(props.selector)) return <span className="sb-component-meta">
    {props.selector.options[0].available === false ? <s-badge tone="warning">Sold out</s-badge> : null}
  </span>;
  const label = `${selectedCount} of ${props.selector.options.length} variants`;
  return <span className="sb-component-meta">
    <s-button command="--show" commandFor={props.modalId} tone={selectedCount ? "auto" : "critical"}
      accessibilityLabel={`Choose variants for ${props.selector.productTitle}, ${label} selected`}>{label}</s-button>
  </span>;
}
