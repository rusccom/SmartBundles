import { useState } from "react";
import { BundleComponentDetails } from "./BundleComponentDetails";
import { BundleComponentHeader } from "./BundleComponentHeader";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentCardProps {
  selector: EditorSelector;
  index: number;
  total: number;
  currencyCode: string;
  locale: string;
  onLabel: (index: number, value: string) => void;
  onOption: (index: number, id: string) => void;
  onMove: (index: number, offset: number) => void;
  onRemove: (index: number) => void;
}

export function BundleComponentCard(props: BundleComponentCardProps) {
  const { selector, index } = props;
  const [expanded, setExpanded] = useState(index === 0);
  const detailsId = `bundle-component-${selector.key}`;
  const selectedCount = selector.options.filter(({ allowed }) => allowed).length;
  return <article className="sb-component">
    <BundleComponentHeader selector={selector} expanded={expanded} detailsId={detailsId}
      selectedCount={selectedCount} currencyCode={props.currencyCode} locale={props.locale}
      onToggle={() => setExpanded((value) => !value)} />
    {expanded ? <BundleComponentDetails {...props} detailsId={detailsId} /> : null}
  </article>;
}
