import { BundleSortableList } from "./BundleSortableList";
import { BundleEditorSection } from "./BundleEditorSection";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleComponentsSectionProps {
  controller: BundleEditorController;
  currencyCode: string;
  locale: string;
  error?: string;
}

export function BundleComponentsSection(props: BundleComponentsSectionProps) {
  const { controller, currencyCode, locale, error } = props;
  return <BundleEditorSection heading="Components">
    {error ? <s-banner tone="critical">{error}</s-banner> : null}
    <BundleSortableList controller={controller} currencyCode={currencyCode} locale={locale} />
    <s-button disabled={controller.busy || controller.draft.selectors.length >= 150}
      onClick={controller.addComponent}>Add components</s-button>
  </BundleEditorSection>;
}
