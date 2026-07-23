import { useCallback, useEffect, useRef } from "react";
import {
  useBeforeUnload,
  useBlocker,
} from "react-router";
import {
  bundleEditorDraftEqual,
  bundleEditorFormData,
} from "./bundle-editor-draft";
import { isBundleOperationBusy } from "./bundle-editor-status";
import type {
  BundleEditorInitial,
  BundleEditorRecovery,
} from "./editor.types";
import { useBundleCanonicalDraft } from "./useBundleCanonicalDraft";
import { useBundleDraftActions } from "./useBundleDraftActions";
import { useBundleEditorTransport } from "./useBundleEditorTransport";

export function useBundleEditorController(
  initial: BundleEditorInitial,
  recovery: BundleEditorRecovery = { state: "ready" },
) {
  const canonical = useBundleCanonicalDraft(initial);
  const allowNavigation = useRef(false);
  const transport = useBundleEditorTransport({
    initial, acceptCanonical: canonical.accept, allowNavigation,
  });
  const actions = useBundleDraftActions(canonical.setDraft);
  const dirty = !bundleEditorDraftEqual(canonical.draft, canonical.baseline);
  const recoveryWaiting = recovery.state === "waiting";
  const busy = controllerBusy(initial.status, transport, recoveryWaiting);
  useUnsavedWarning(dirty, allowNavigation, canonical.discard);
  const reload = useReloadCommand(allowNavigation);
  const commands = controllerCommands({ busy, canonical, transport, reload });
  return controllerValue({
    recovery, canonical, transport, actions, commands, dirty, busy,
  });
}

export type BundleEditorController = ReturnType<typeof useBundleEditorController>;

interface ControllerCommandInput {
  busy: boolean;
  canonical: ReturnType<typeof useBundleCanonicalDraft>;
  transport: ReturnType<typeof useBundleEditorTransport>;
  reload: () => void;
}

function controllerCommands(input: ControllerCommandInput) {
  const submit = () => {
    if (!input.busy) {
      input.transport.submit(bundleEditorFormData(
        input.canonical.identity,
        input.canonical.draft,
      ));
    }
  };
  const discard = () => {
    input.canonical.discard();
    input.transport.clearFeedback();
  };
  return { submit, discard, reload: input.reload };
}

function controllerBusy(
  status: BundleEditorInitial["status"],
  transport: ReturnType<typeof useBundleEditorTransport>,
  recoveryWaiting: boolean,
): boolean {
  return recoveryWaiting || transport.saving || transport.awaitingCanonical
    || transport.uncertain
    || isBundleOperationBusy(status);
}

function useReloadCommand(allowNavigationRef: React.MutableRefObject<boolean>) {
  return useCallback(() => {
    allowNavigationRef.current = true;
    window.location.reload();
  }, [allowNavigationRef]);
}

interface ControllerValueInput {
  recovery: BundleEditorRecovery;
  canonical: ReturnType<typeof useBundleCanonicalDraft>;
  transport: ReturnType<typeof useBundleEditorTransport>;
  actions: ReturnType<typeof useBundleDraftActions>;
  commands: ReturnType<typeof controllerCommands>;
  dirty: boolean;
  busy: boolean;
}

function controllerValue(input: ControllerValueInput) {
  const recoveryWaiting = input.recovery.state === "waiting";
  return {
    draft: input.canonical.draft, dirty: input.dirty, busy: input.busy,
    saving: input.transport.saving || input.transport.awaitingCanonical,
    uncertain: input.transport.uncertain || recoveryWaiting,
    phase: recoveryWaiting ? "sync_uncertain" : input.transport.phase,
    errors: input.transport.feedback?.errors ?? {},
    message: input.transport.feedback?.message ?? input.recovery.message,
    messageTone: input.transport.feedback?.tone ?? "critical",
    issue: input.transport.feedback?.issue,
    ...input.commands, ...input.actions,
  };
}

function useUnsavedWarning(
  dirty: boolean,
  allowNavigation: React.MutableRefObject<boolean>,
  discard: () => void,
): void {
  const blocker = useBlocker(() => dirty && !allowNavigation.current);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Discard unsaved bundle changes?")) {
      discard();
      blocker.proceed();
    }
    else blocker.reset();
  }, [blocker, discard]);
  useBeforeUnload(useCallback((event) => {
    if (!dirty || allowNavigation.current) return;
    event.preventDefault();
    event.returnValue = "";
  }, [allowNavigation, dirty]));
}
