import { useCallback, useEffect, useRef } from "react";
import { useBeforeUnload, useBlocker } from "react-router";
import { bundleEditorDraftEqual, bundleEditorFormData } from "./bundle-editor-draft";
import type { BundleEditorInitial } from "./editor.types";
import { useBundleCanonicalDraft } from "./useBundleCanonicalDraft";
import { useBundleDraftActions } from "./useBundleDraftActions";
import { useBundleEditorTransport } from "./useBundleEditorTransport";

export function useBundleEditorController(initial: BundleEditorInitial) {
  const canonical = useBundleCanonicalDraft(initial);
  const allowNavigation = useRef(false);
  const permitNavigation = useCallback(() => { allowNavigation.current = true; }, []);
  const transport = useBundleEditorTransport({
    initial, acceptCanonical: canonical.accept, allowNavigation: permitNavigation,
  });
  const actions = useBundleDraftActions(canonical.setDraft);
  const dirty = !bundleEditorDraftEqual(canonical.draft, canonical.baseline);
  useUnsavedWarning(dirty, allowNavigation, canonical.discard);
  return controllerValue(canonical, transport, actions, dirty);
}

function controllerValue(
  canonical: ReturnType<typeof useBundleCanonicalDraft>,
  transport: ReturnType<typeof useBundleEditorTransport>,
  actions: ReturnType<typeof useBundleDraftActions>,
  dirty: boolean,
) {
  const submit = () => submitDraft(canonical, transport);
  const discard = () => discardDraft(canonical, transport);
  return {
    draft: canonical.draft, dirty, busy: transport.saving, saving: transport.saving,
    errors: transport.feedback?.errors ?? {},
    message: transport.feedback?.message, messageTone: "critical" as const,
    issue: transport.feedback?.issue, submit, discard, ...actions,
  };
}

function submitDraft(
  canonical: ReturnType<typeof useBundleCanonicalDraft>,
  transport: ReturnType<typeof useBundleEditorTransport>,
): void {
  if (transport.saving) return;
  transport.submit(
    bundleEditorFormData(canonical.identity, canonical.baseline, canonical.draft),
    canonical.draft,
  );
}

function discardDraft(
  canonical: ReturnType<typeof useBundleCanonicalDraft>,
  transport: ReturnType<typeof useBundleEditorTransport>,
): void {
  canonical.discard();
  transport.clearFeedback();
}

export type BundleEditorController = ReturnType<typeof useBundleEditorController>;

function useUnsavedWarning(
  dirty: boolean,
  allowNavigation: React.MutableRefObject<boolean>,
  discard: () => void,
): void {
  const blocker = useBlocker(() => dirty && !allowNavigation.current);
  useDiscardConfirmation(blocker, discard);
  useBeforeUnload(useCallback((event) => {
    if (!dirty || allowNavigation.current) return;
    event.preventDefault();
    event.returnValue = "";
  }, [allowNavigation, dirty]));
}

function useDiscardConfirmation(
  blocker: ReturnType<typeof useBlocker>,
  discard: () => void,
): void {
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Discard unsaved bundle changes?")) {
      discard();
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, discard]);
}
