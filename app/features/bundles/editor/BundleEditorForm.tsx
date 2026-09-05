import { BundleEditorSections } from "./BundleEditorSections";
import type { BundleEditorInitial } from "./editor.types";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleEditorFormProps {
  initial: BundleEditorInitial;
  controller: BundleEditorController;
  pricingEnabled: boolean;
}

export function BundleEditorForm(props: BundleEditorFormProps) {
  const { controller } = props;
  return <form className="sb-editor-form" aria-busy={controller.busy}
    onSubmit={(event) => { event.preventDefault(); controller.submit(); }}>
    <fieldset className="sb-editor-fieldset" disabled={controller.busy}>
      <s-stack direction="block" gap="base">
        <BundleEditorSections initial={props.initial} controller={controller}
          pricingEnabled={props.pricingEnabled} />
      </s-stack>
    </fieldset>
  </form>;
}
