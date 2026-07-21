import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BundleComponentCard } from "./BundleComponentCard";
import { bundleDndAnnouncements, bundleScreenReaderInstructions } from "./bundle-dnd-announcements";
import type { ReturnTypeBundleEditor } from "./bundle-editor-hook.types";
import { useBundleDnd } from "./useBundleDnd";

export interface BundleSortableListProps {
  editor: ReturnTypeBundleEditor;
  currencyCode: string;
  locale: string;
}

export function BundleSortableList({ editor, currencyCode, locale }: BundleSortableListProps) {
  const dnd = useBundleDnd(editor.reorder);
  const items = editor.selectors.map(({ key }) => key);
  const accessibility = { announcements: bundleDndAnnouncements(editor.selectors),
    screenReaderInstructions: bundleScreenReaderInstructions };
  return <DndContext sensors={dnd.sensors} collisionDetection={closestCenter}
    accessibility={accessibility} onDragEnd={dnd.onDragEnd}>
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      <div className="sb-component-list">{editor.selectors.map((selector, index) =>
        <BundleComponentCard key={selector.key} selector={selector} index={index}
          currencyCode={currencyCode} locale={locale} onOption={editor.option}
          onQuantity={editor.quantity} onRemove={editor.remove} />
      )}</div>
    </SortableContext>
  </DndContext>;
}
