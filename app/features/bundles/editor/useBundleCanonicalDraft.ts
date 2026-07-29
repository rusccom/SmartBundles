import { useCallback, useEffect, useMemo, useState } from "react";
import { bundleEditorDraftEqual, initialBundleEditorDraft } from "./bundle-editor-draft";
import type { BundleEditorDraft, BundleEditorInitial } from "./editor.types";

interface CanonicalState {
  key: string;
  identity: BundleEditorInitial;
  baseline: BundleEditorDraft;
  draft: BundleEditorDraft;
}

export function useBundleCanonicalDraft(initial: BundleEditorInitial) {
  const canonical = useMemo(() => initialBundleEditorDraft(initial), [initial]);
  const key = canonicalKey(initial);
  const [state, setState] = useState(() => draftState(key, initial, canonical));
  useCanonicalRefresh(setState, state, key, initial, canonical);
  const setDraft = useCallback<React.Dispatch<React.SetStateAction<BundleEditorDraft>>>(
    (update) => setState((current) => ({
      ...current,
      draft: typeof update === "function" ? update(current.draft) : update,
    })),
    [],
  );
  const accept = useCallback((saved: BundleEditorDraft) =>
    setState((current) => ({ ...current, baseline: saved, draft: saved })), []);
  const discard = useCallback(() =>
    setState((current) => ({ ...current, draft: current.baseline })), []);
  return { ...state, setDraft, accept, discard };
}

function useCanonicalRefresh(
  setState: React.Dispatch<React.SetStateAction<CanonicalState>>,
  state: CanonicalState,
  key: string,
  initial: BundleEditorInitial,
  canonical: BundleEditorDraft,
): void {
  const clean = bundleEditorDraftEqual(state.draft, state.baseline);
  useEffect(() => {
    if (!clean) return;
    setState((current) => current.key === key
      ? current
      : draftState(key, initial, canonical));
  }, [canonical, clean, initial, key, setState]);
}

function draftState(
  key: string,
  identity: BundleEditorInitial,
  draft: BundleEditorDraft,
): CanonicalState {
  return { key, identity, baseline: draft, draft };
}

function canonicalKey(initial: BundleEditorInitial): string {
  return JSON.stringify(initial);
}
