import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BundleComponentDetails } from "./BundleComponentDetails";
import { BundleComponentHeader } from "./BundleComponentHeader";
import { BundleSimpleComponentCard } from "./BundleSimpleComponentCard";
import { isSimpleBundleComponent } from "./bundle-component-presentation";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentCardProps {
  selector: EditorSelector;
  index: number;
  currencyCode: string;
  locale: string;
  onOption: (index: number, id: string) => void;
  onQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
}

export function BundleComponentCard(props: BundleComponentCardProps) {
  const [expanded, setExpanded] = useState(props.index === 0);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.selector.key });
  const detailsId = `bundle-component-${props.selector.key}`;
  const selectedCount = props.selector.options.filter(({ allowed }) => allowed).length;
  const style = { transform: CSS.Transform.toString(transform), transition };
  const className = `sb-component${isDragging ? " sb-component-dragging" : ""}`;
  const dragHandle = <button type="button" className="sb-drag-handle" ref={setActivatorNodeRef}
    {...attributes} {...listeners} aria-label={`Move ${props.selector.productTitle}`}><s-icon type="drag-handle" /></button>;
  if (isSimpleBundleComponent(props.selector)) return <article ref={setNodeRef} style={style} className={className}>
    <BundleSimpleComponentCard {...props} dragHandle={dragHandle} />
  </article>;
  return <article ref={setNodeRef} style={style} className={className}>
    <BundleComponentHeader selector={props.selector} expanded={expanded} detailsId={detailsId}
      selectedCount={selectedCount} currencyCode={props.currencyCode} locale={props.locale}
      dragHandle={dragHandle} onToggle={() => setExpanded((value) => !value)} />
    {expanded ? <BundleComponentDetails {...props} detailsId={detailsId} /> : null}
  </article>;
}
