import { BundleSortableList } from "./BundleSortableList";
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
      <s-paragraph>{sectionSummary(editor.selectors)} Each component requires at least one allowed variant.</s-paragraph>
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
      <BundleSortableList editor={editor} currencyCode={currencyCode} locale={locale} />
      <s-button disabled={editor.selectors.length >= 150} onClick={editor.addComponent}>Add components</s-button>
    </s-stack>
  </s-section>;
}

function sectionSummary(selectors: EditorSelector[]): string {
  const selected = selectors.reduce((total, selector) =>
    total + selector.options.filter(({ allowed }) => allowed).length, 0);
  const variants = selectors.reduce((total, selector) => total + selector.options.length, 0);
  const componentLabel = selectors.length === 1 ? "component" : "components";
  return `${selectors.length} ${componentLabel} · ${selected} of ${variants} variants allowed.`;
}
