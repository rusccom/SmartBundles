import { BundleEditorSaveBar } from "./BundleEditorSaveBar";
import { BundleEditorSections } from "./BundleEditorSections";
import type { BundleEditorInitial } from "./editor.types";
import { useBundleEditorController } from "./useBundleEditorController";

export interface BundleEditorFormProps {
  initial: BundleEditorInitial;
  pricingEnabled: boolean;
}

export function BundleEditorForm(props: BundleEditorFormProps) {
  const controller = useBundleEditorController(props.initial);
  return <>
    <BundleEditorSaveBar dirty={controller.dirty} saving={controller.saving}
      blocked={controller.busy}
      onSave={controller.submit} onDiscard={controller.discard} />
    <form className="sb-editor-form" aria-busy={controller.busy}
      onSubmit={(event) => { event.preventDefault(); controller.submit(); }}>
      <fieldset className="sb-editor-fieldset" disabled={controller.busy}>
        <BundleEditorSections initial={props.initial} controller={controller}
          pricingEnabled={props.pricingEnabled} />
      </fieldset>
    </form>
  </>;
}
