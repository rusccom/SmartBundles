import { BundleComponentCard } from "./BundleComponentCard";
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
      <div className="sb-component-list">{editor.selectors.map((selector, index) =>
        <BundleComponentCard key={selector.key} selector={selector} index={index} total={editor.selectors.length}
          currencyCode={currencyCode} locale={locale} onLabel={editor.label} onOption={editor.option}
          onMove={editor.move} onRemove={editor.remove} />
      )}</div>
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
