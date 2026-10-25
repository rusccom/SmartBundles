import type { useSortable } from "@dnd-kit/sortable";

interface BundleDragHandleProps extends Pick<ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef"> {
  title: string;
}

export function BundleDragHandle({ attributes, listeners, setActivatorNodeRef, title }: BundleDragHandleProps) {
  return <button type="button" className="sb-drag-handle" ref={setActivatorNodeRef}
    {...attributes} {...listeners} aria-label={`Move ${title}`}>
    <s-icon type="drag-handle" />
  </button>;
}
