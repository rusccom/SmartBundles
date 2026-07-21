import { BundleVariantOptionRow } from "./BundleVariantOptionRow";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentCardProps {
  selector: EditorSelector;
  index: number;
  total: number;
  onLabel: (index: number, value: string) => void;
  onOption: (index: number, id: string) => void;
  onMove: (index: number, offset: number) => void;
  onRemove: (index: number) => void;
}

export function BundleComponentCard(props: BundleComponentCardProps) {
  const { selector, index, total } = props;
  return <article className="sb-component">
    <header><strong>{index + 1}. {selector.productTitle}</strong><span>{selector.options.filter(({ allowed }) => allowed).length} allowed</span></header>
    <label>Customer-facing label<input value={selector.label} onChange={(event) => props.onLabel(index, event.currentTarget.value)} /></label>
    <fieldset><legend>Allowed variants</legend>{selector.options.map((option) =>
      <BundleVariantOptionRow key={option.id} option={option} onToggle={(id) => props.onOption(index, id)} />
    )}</fieldset>
    <footer>
      <button type="button" disabled={index === 0} onClick={() => props.onMove(index, -1)}>Move up</button>
      <button type="button" disabled={index === total - 1} onClick={() => props.onMove(index, 1)}>Move down</button>
      <button type="button" className="critical" onClick={() => props.onRemove(index)}>Remove</button>
    </footer>
  </article>;
}
