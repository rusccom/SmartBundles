import { BundleEditorSaveBar } from "./BundleEditorSaveBar";
import { BundleEditorSections } from "./BundleEditorSections";
import type { BundleEditorInitial, BundleEditorRecovery } from "./editor.types";
import { useBundleEditorController } from "./useBundleEditorController";

export interface BundleEditorFormProps {
  initial: BundleEditorInitial;
  quotaCandidates: Array<{ id: string; title: string }>;
  pricingEnabled: boolean;
  recovery?: BundleEditorRecovery;
}

export function BundleEditorForm(props: BundleEditorFormProps) {
  const controller = useBundleEditorController(props.initial, props.recovery);
  return <>
    <BundleEditorSaveBar dirty={controller.dirty} saving={controller.saving}
      blocked={controller.busy}
      onSave={controller.submit} onDiscard={controller.discard} />
    <form className="sb-editor-form" aria-busy={controller.busy}
      onSubmit={(event) => { event.preventDefault(); controller.submit(); }}>
      <fieldset className="sb-editor-fieldset" disabled={controller.busy}>
        <BundleEditorSections initial={props.initial} controller={controller}
          quotaCandidates={props.quotaCandidates} pricingEnabled={props.pricingEnabled} />
      </fieldset>
    </form>
  </>;
}
