import { useRef, useState } from "react";
import { Form, useNavigation } from "react-router";
import { BundleEditorSaveBar } from "./BundleEditorSaveBar";
import { BundleEditorSections } from "./BundleEditorSections";
import { desiredStatus, isBundleOperationBusy } from "./bundle-editor-status";
import { serializedSelectors } from "./editor-state";
import type { BundleEditorInitial } from "./editor.types";
import { useBundleEditor } from "./useBundleEditor";
import { useBundleFormDirty } from "./useBundleFormDirty";

export interface BundleEditorFormProps {
  initial: BundleEditorInitial;
  errors: Record<string, string>;
  quotaCandidates: Array<{ id: string; title: string }>;
  pricingEnabled: boolean;
  serverMessage?: string;
  onDiscard: () => void;
}

export function BundleEditorForm(props: BundleEditorFormProps) {
  const { editor, formRef, status, setStatus, serialized, dirty, busy, submit } =
    useEditorFormState(props.initial);
  return <>
    <BundleEditorSaveBar open={dirty.dirty} busy={busy} onSave={submit} onDiscard={props.onDiscard} />
    <Form method="post" ref={formRef} className="sb-editor-form" aria-busy={busy}
      onInput={dirty.scheduleCheck} onChange={dirty.scheduleCheck} onClick={dirty.scheduleCheck}>
      <input type="hidden" name="selectors" value={serialized} />
      <input type="hidden" name="bundleVersion" value={props.initial.version} />
      <input type="hidden" name="contentVersionToken" value={props.initial.contentVersionToken ?? ""} />
      <input type="hidden" name="creationToken" value={props.initial.creationToken ?? ""} />
      <BundleEditorSections {...props} editor={editor} status={status}
        busy={busy} onStatusChange={setStatus} />
    </Form>
  </>;
}

function useEditorFormState(initial: BundleEditorInitial) {
  const editor = useBundleEditor(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const [status, setStatus] = useState(() => desiredStatus(initial.status));
  const serialized = serializedSelectors(editor.selectors);
  const fingerprint = JSON.stringify([serialized, editor.pricingMode, status]);
  const dirty = useBundleFormDirty(formRef, fingerprint);
  const busy = navigation.state !== "idle" || isBundleOperationBusy(initial.status);
  const submit = () => { if (!busy) formRef.current?.requestSubmit(); };
  return { editor, formRef, status, setStatus, serialized, dirty, busy, submit };
}
