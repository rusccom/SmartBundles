import { BundleSortableList } from "./BundleSortableList";
import { isSimpleBundleComponent } from "./bundle-component-presentation";
import type { ReturnTypeBundleEditor } from "./bundle-editor-hook.types";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentsSectionProps {
  editor: ReturnTypeBundleEditor;
  currencyCode: string;
  locale: string;
  error?: string;
}

export function BundleComponentsSection({ editor, currencyCode, locale, error }: BundleComponentsSectionProps) {
  return <s-section heading="Components">
    <s-stack direction="block" gap="base">
      <s-paragraph>{sectionSummary(editor.selectors)}</s-paragraph>
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
      <BundleSortableList editor={editor} currencyCode={currencyCode} locale={locale} />
      <s-button disabled={editor.selectors.length >= 150} onClick={editor.addComponent}>Add components</s-button>
    </s-stack>
  </s-section>;
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
