import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { BundleEditorActionData, BundleEditorIssue } from "../bundle-editor-action.types";
import type { BundleEditorDraft, BundleEditorInitial } from "./editor.types";

interface EditorFeedback {
  errors: Record<string, string>;
  message?: string;
  issue?: BundleEditorIssue;
}

interface TransportInput {
  initial: BundleEditorInitial;
  acceptCanonical: (saved: BundleEditorDraft) => void;
  allowNavigation: () => void;
}

export function useBundleEditorTransport(input: TransportInput) {
  const fetcher = useFetcher<BundleEditorActionData>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [feedback, setFeedback] = useState<EditorFeedback>();
  const [submitted, setSubmitted] = useState<BundleEditorDraft>();
  useActionResult({
    input, result: fetcher.data, submitted,
    setFeedback, navigate, shopify,
  });
  const submit = useCallback((form: FormData, draft: BundleEditorDraft) => {
    setSubmitted(draft);
    setFeedback(undefined);
    fetcher.submit(form, { method: "post" });
  }, [fetcher]);
  return {
    feedback, saving: fetcher.state !== "idle", submit,
    clearFeedback: () => setFeedback(undefined),
  };
}

interface ConsumeInput {
  input: TransportInput,
  result?: BundleEditorActionData;
  submitted?: BundleEditorDraft;
  setFeedback: React.Dispatch<React.SetStateAction<EditorFeedback | undefined>>;
  navigate: ReturnType<typeof useNavigate>;
  shopify: ReturnType<typeof useAppBridge>;
}

function useActionResult(state: ConsumeInput): void {
  const lastData = useRef<BundleEditorActionData>();
  useEffect(() => {
    if (!state.result || lastData.current === state.result) return;
    lastData.current = state.result;
    consumeResult(state);
  }, [state]);
}

function consumeResult(state: ConsumeInput): void {
  const { result } = state;
  if (!result) return;
  if (result.outcome === "rejected") {
    state.setFeedback({ errors: result.errors, message: result.message, issue: result.issue });
    return;
  }
  if (!state.submitted) return;
  state.input.acceptCanonical({ ...state.submitted, desiredStatus: result.status });
  state.shopify.toast.show(result.message);
  if (!state.input.initial.id) {
    state.input.allowNavigation();
    void state.navigate(`/app/bundles/${result.bundleId}`);
  }
}
