import { BundleSortableList } from "./BundleSortableList";
import { BundleEditorSection } from "./BundleEditorSection";
import { isSimpleBundleComponent } from "./bundle-component-presentation";
import type { EditorSelector } from "./editor.types";
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
    <s-paragraph>{sectionSummary(controller.draft.selectors)}</s-paragraph>
    {error ? <s-banner tone="critical">{error}</s-banner> : null}
    <BundleSortableList controller={controller} currencyCode={currencyCode} locale={locale} />
    <s-button disabled={controller.busy || controller.draft.selectors.length >= 150}
      onClick={controller.addComponent}>Add components</s-button>
  </BundleEditorSection>;
}

function sectionSummary(selectors: EditorSelector[]): string {
  const configurable = selectors.filter((selector) => !isSimpleBundleComponent(selector));
  const selected = configurable.reduce((total, selector) =>
    total + selector.options.filter(({ allowed }) => allowed).length, 0);
  const variants = configurable.reduce((total, selector) => total + selector.options.length, 0);
  const componentLabel = selectors.length === 1 ? "component" : "components";
  const componentSummary = `${selectors.length} ${componentLabel} added.`;
  if (!configurable.length) return componentSummary;
  return `${componentSummary} ${selected} of ${variants} configurable variants allowed. ` +
    "Each configurable component requires at least one allowed variant.";
}
