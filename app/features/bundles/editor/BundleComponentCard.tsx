import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BundleComponentHeader } from "./BundleComponentHeader";
import { BundleVariantPickerModal } from "./BundleVariantPickerModal";
import { isSimpleBundleComponent } from "./bundle-component-presentation";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentCardProps {
  selector: EditorSelector;
  index: number;
  currencyCode: string;
  locale: string;
  discountDisabled: boolean;
  onOption: (index: number, id: string) => void;
  onQuantity: (index: number, quantity: number) => void;
  onDiscount: (index: number, discountPercent: string) => void;
  onRemove: (index: number) => void;
}

export function BundleComponentCard(props: BundleComponentCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.selector.key });
  const modalId = `bundle-component-variants-${props.selector.key}`;
  const style = { transform: CSS.Transform.toString(transform), transition };
  const className = `sb-component${isDragging ? " sb-component-dragging" : ""}`;
  const dragHandle = <button type="button" className="sb-drag-handle" ref={setActivatorNodeRef}
    {...attributes} {...listeners} aria-label={`Move ${props.selector.productTitle}`}><s-icon type="drag-handle" /></button>;
  return <>
    <article ref={setNodeRef} style={style} className={className}>
      <BundleComponentHeader {...props} modalId={modalId} dragHandle={dragHandle} />
    </article>
    {!isSimpleBundleComponent(props.selector)
      ? <BundleVariantPickerModal {...props} modalId={modalId} /> : null}
  </>;
}
