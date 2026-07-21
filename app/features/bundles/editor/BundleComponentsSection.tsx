import { BundleComponentCard } from "./BundleComponentCard";
import type { ReturnTypeBundleEditor } from "./bundle-editor-hook.types";

export interface BundleComponentsSectionProps { editor: ReturnTypeBundleEditor; error?: string }

export function BundleComponentsSection({ editor, error }: BundleComponentsSectionProps) {
  return <s-section heading="Components">
    <s-stack direction="block" gap="base">
      <s-paragraph>{editor.selectors.length} components added. Each component requires at least one allowed variant.</s-paragraph>
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
      <div className="sb-component-list">{editor.selectors.map((selector, index) =>
        <BundleComponentCard key={selector.key} selector={selector} index={index} total={editor.selectors.length}
          onLabel={editor.label} onOption={editor.option} onMove={editor.move} onRemove={editor.remove} />
      )}</div>
      <s-button disabled={editor.selectors.length >= 150} onClick={editor.addComponent}>Add components</s-button>
    </s-stack>
  </s-section>;
}
