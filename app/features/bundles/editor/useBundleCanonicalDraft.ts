import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bundleEditorDraftEqual,
  initialBundleEditorDraft,
} from "./bundle-editor-draft";
import type {
  BundleEditorDraft,
  BundleEditorInitial,
} from "./editor.types";

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
    (update) => setState((value) => ({
      ...value,
      draft: typeof update === "function" ? update(value.draft) : update,
    })),
    [],
  );
  const accept = useCallback((patch?: Partial<BundleEditorDraft>) =>
    setState(acceptedState(key, initial, canonical, patch)),
  [canonical, initial, key]);
  const discard = useCallback(() =>
    setState(draftState(key, initial, canonical)), [canonical, initial, key]);
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
  useEffect(() => updateCleanCanonical(setState, key, initial, canonical),
    [canonical, clean, initial, key, setState]);
}

function updateCleanCanonical(
  setState: React.Dispatch<React.SetStateAction<CanonicalState>>,
  key: string,
  initial: BundleEditorInitial,
  canonical: BundleEditorDraft,
): void {
  setState((current) => {
    if (current.key === key) return current;
    const sameEntity = current.identity.id === initial.id;
    if (sameEntity && !bundleEditorDraftEqual(current.draft, current.baseline)) return current;
    return draftState(key, initial, canonical);
  });
}

function draftState(
  key: string,
  identity: BundleEditorInitial,
  draft: BundleEditorDraft,
): CanonicalState {
  return { key, identity, baseline: draft, draft };
}

function acceptedState(
  key: string,
  identity: BundleEditorInitial,
  baseline: BundleEditorDraft,
  patch?: Partial<BundleEditorDraft>,
): CanonicalState {
  return { key, identity, baseline, draft: { ...baseline, ...patch } };
}

function canonicalKey(initial: BundleEditorInitial): string {
  return [
    initial.id ?? "new",
    initial.editorRevision ?? "new",
    initial.version,
    initial.contentVersionToken ?? "",
  ].join(":");
}
