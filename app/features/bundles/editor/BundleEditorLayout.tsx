import { BundlePreviewPanel } from "../preview/BundlePreviewPanel";
import { BundleEditorForm, type BundleEditorFormProps } from "./BundleEditorForm";
import { BundleStatusPanel } from "./BundleStatusPanel";

const EDITOR_COLUMNS = '@container (inline-size >= 752px) "minmax(0, 2fr) minmax(240px, 1fr)", "minmax(0, 1fr)"';

export function BundleEditorLayout(props: BundleEditorFormProps) {
  const { controller, initial } = props;
  return <s-query-container>
    <s-grid gridTemplateColumns={EDITOR_COLUMNS} gap="base" alignItems="start">
      <BundleEditorForm {...props} />
      <s-stack accessibilityRole="aside" direction="block" gap="base">
        <BundleStatusPanel controller={controller} />
        <BundlePreviewPanel draft={controller.draft} currencyCode={initial.currencyCode}
          image={controller.draft.media.image} locale={initial.locale} texts={initial.texts} />
      </s-stack>
    </s-grid>
  </s-query-container>;
}
