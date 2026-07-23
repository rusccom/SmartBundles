import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BundleComponentCard } from "./BundleComponentCard";
import { bundleDndAnnouncements, bundleScreenReaderInstructions } from "./bundle-dnd-announcements";
import { useBundleDnd } from "./useBundleDnd";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleSortableListProps {
  controller: BundleEditorController;
  currencyCode: string;
  locale: string;
}

export function BundleSortableList({ controller, currencyCode, locale }: BundleSortableListProps) {
  const dnd = useBundleDnd(controller.reorder);
  const selectors = controller.draft.selectors;
  const items = selectors.map(({ key }) => key);
  const accessibility = { announcements: bundleDndAnnouncements(selectors),
    screenReaderInstructions: bundleScreenReaderInstructions };
  return <DndContext sensors={dnd.sensors} collisionDetection={closestCenter}
    accessibility={accessibility} onDragEnd={dnd.onDragEnd}>
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      <div className="sb-component-list">{selectors.map((selector, index) =>
        <BundleComponentCard key={selector.key} selector={selector} index={index}
          currencyCode={currencyCode} locale={locale}
          discountDisabled={controller.draft.pricingMode === "FIXED"}
          onOption={controller.option} onQuantity={controller.quantity}
          onDiscount={controller.discount} onRemove={controller.remove} />
      )}</div>
    </SortableContext>
  </DndContext>;
}
