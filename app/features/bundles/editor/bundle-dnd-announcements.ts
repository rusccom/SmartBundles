import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";
import type { EditorSelector } from "./editor.types";

export const bundleScreenReaderInstructions = {
  draggable: "Press Space or Enter to pick up a component. Use arrow keys to move it, Space or Enter to drop, and Escape to cancel.",
};

export function bundleDndAnnouncements(selectors: EditorSelector[]): Announcements {
  return {
    onDragStart: ({ active }) => `Picked up ${itemName(selectors, active.id)}. ${itemPosition(selectors, active.id)}.`,
    onDragOver: ({ active, over }) => over ? `${itemName(selectors, active.id)} over ${itemPosition(selectors, over.id)}.` : undefined,
    onDragEnd: ({ active, over }) => over ? `Dropped ${itemName(selectors, active.id)} at ${itemPosition(selectors, over.id)}.` : "Component was not moved.",
    onDragCancel: ({ active }) => `Moving ${itemName(selectors, active.id)} was cancelled.`,
  };
}

function itemName(selectors: EditorSelector[], id: UniqueIdentifier): string {
  return selectors.find(({ key }) => key === Number(id))?.productTitle ?? "component";
}

function itemPosition(selectors: EditorSelector[], id: UniqueIdentifier): string {
  const position = selectors.findIndex(({ key }) => key === Number(id));
  return `position ${position + 1} of ${selectors.length}`;
}
