import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export function useBundleDnd(reorder: (activeKey: number, overKey: number) => void) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) reorder(Number(active.id), Number(over.id));
  }, [reorder]);
  return { sensors, onDragEnd };
}
