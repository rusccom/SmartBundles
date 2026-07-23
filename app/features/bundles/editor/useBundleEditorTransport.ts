import { useCallback, useEffect, useRef, useState } from "react";
import {
  useFetcher,
  useLocation,
  useNavigate,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type {
  BundleEditorActionData,
  BundleEditorReceipt,
  BundleEditorReceiptKind,
} from "../bundle-editor-action.types";
import type {
  BundleEditorDraft,
  BundleEditorInitial,
} from "./editor.types";

const SAVE_BAR_ID = "bundle-editor-save-bar";

type FeedbackTone = "critical" | "warning";

interface EditorFeedback {
  errors: Record<string, string>;
  message?: string;
  tone: FeedbackTone;
  issue?: BundleEditorReceiptKind;
  uncertain?: boolean;
}

interface TransportInput {
  initial: BundleEditorInitial;
  acceptCanonical: (patch?: Partial<BundleEditorDraft>) => void;
  allowNavigation: React.MutableRefObject<boolean>;
}

export function useBundleEditorTransport(input: TransportInput) {
  const services = useTransportServices();
  const state = useTransportState(services.location.state);
  useTransportEffects(input, services, state);
  const submit = useTransportSubmit(services.fetcher, state);
  return transportValue(
    services.fetcher.state, state.pending, state.feedback, submit, state.setFeedback,
  );
}

function useTransportServices() {
  const fetcher = useFetcher<BundleEditorActionData>();
  const location = useLocation();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  return { fetcher, location, navigate, shopify };
}

function useTransportState(locationState: unknown) {
  const [pending, setPending] = useState(() => navigationReceipt(locationState));
  const [feedback, setFeedback] = useState<EditorFeedback>();
  const [notice, setNotice] = useState<BundleEditorReceipt>();
  const lastData = useRef<BundleEditorActionData>();
  return { pending, setPending, feedback, setFeedback, notice, setNotice, lastData };
}

type TransportServices = ReturnType<typeof useTransportServices>;
type TransportState = ReturnType<typeof useTransportState>;

function useTransportEffects(
  input: TransportInput,
  services: TransportServices,
  state: TransportState,
): void {
  useConsumeResultEffect(input, services, state);
  useReconcileReceiptEffect(input, state);
  useNoticeEffect(services.shopify, state);
  useClearReceiptEffect(input, services, state.pending);
}

function useConsumeResultEffect(
  input: TransportInput,
  services: TransportServices,
  state: TransportState,
): void {
  useEffect(() => consumeActionData({
    result: services.fetcher.data, initialId: input.initial.id,
    navigate: services.navigate, allowNavigation: input.allowNavigation,
    lastData: state.lastData, setPending: state.setPending, setFeedback: state.setFeedback,
  }), [input.allowNavigation, input.initial.id, services.fetcher.data,
    services.navigate, state.lastData, state.setFeedback, state.setPending]);
}

function useReconcileReceiptEffect(
  input: TransportInput,
  state: TransportState,
): void {
  useEffect(() => reconcileReceipt({
    receipt: state.pending, initial: input.initial,
    acceptCanonical: input.acceptCanonical, setPending: state.setPending,
    setFeedback: state.setFeedback, setNotice: state.setNotice,
  }), [input.acceptCanonical, input.initial, state.pending,
    state.setFeedback, state.setNotice, state.setPending]);
}

function useNoticeEffect(
  shopify: ReturnType<typeof useAppBridge>,
  state: TransportState,
): void {
  useEffect(() => showNotice(shopify, state.notice, state.setNotice),
    [shopify, state.notice, state.setNotice]);
}

function useClearReceiptEffect(
  input: TransportInput,
  services: TransportServices,
  pending: BundleEditorReceipt | undefined,
): void {
  useEffect(() => clearReceiptState({
    location: services.location, navigate: services.navigate,
    allowNavigation: input.allowNavigation, pending,
  }), [input.allowNavigation, pending, services.location, services.navigate]);
}

function useTransportSubmit(
  fetcher: ReturnType<typeof useFetcher<BundleEditorActionData>>,
  state: TransportState,
) {
  return useCallback((form: FormData) => {
    state.setFeedback(undefined);
    state.setPending(undefined);
    fetcher.submit(form, { method: "post" });
  }, [fetcher, state]);
}

interface ConsumeInput {
  result?: BundleEditorActionData;
  initialId?: string;
  navigate: ReturnType<typeof useNavigate>;
  allowNavigation: React.MutableRefObject<boolean>;
  lastData: React.MutableRefObject<BundleEditorActionData | undefined>;
  setPending: ReceiptSetter;
  setFeedback: FeedbackSetter;
}

function consumeActionData(input: ConsumeInput): void {
  const { result } = input;
  if (!result || input.lastData.current === result) return;
  input.lastData.current = result;
  if (result.outcome !== "accepted") {
    input.setFeedback(resultFeedback(result));
    return;
  }
  if (input.initialId) {
    input.setPending(result.receipt);
    return;
  }
  input.allowNavigation.current = true;
  input.navigate(`/app/bundles/${result.receipt.bundleId}`, {
    state: { editorReceipt: result.receipt },
  });
}

interface ReconcileInput {
  receipt?: BundleEditorReceipt;
  initial: BundleEditorInitial;
  acceptCanonical: (patch?: Partial<BundleEditorDraft>) => void;
  setPending: ReceiptSetter;
  setFeedback: FeedbackSetter;
  setNotice: ReceiptSetter;
}

function reconcileReceipt(input: ReconcileInput): void {
  const receipt = input.receipt;
  if (!receipt || receipt.bundleId !== input.initial.id) return;
  const revision = input.initial.editorRevision;
  if (revision === null || revision < receipt.editorRevision) return;
  if (revision > receipt.editorRevision) {
    acceptSuperseded(input);
    return;
  }
  const patch = isActivationRetry(receipt)
    ? { desiredStatus: "ACTIVE" as const }
    : undefined;
  input.acceptCanonical(patch);
  input.setPending(undefined);
  input.setFeedback(receiptFeedback(receipt));
  input.setNotice(receipt);
}

function acceptSuperseded(input: ReconcileInput): void {
  input.acceptCanonical();
  input.setPending(undefined);
  input.setFeedback({
    errors: {},
    message: "A newer bundle version was loaded. Review the current values before editing again.",
    tone: "warning",
  });
}

function showNotice(
  shopify: ReturnType<typeof useAppBridge>,
  receipt: BundleEditorReceipt | undefined,
  setNotice: ReceiptSetter,
): void {
  if (!receipt) return;
  const show = async () => {
    await shopify.saveBar.hide(SAVE_BAR_ID);
    shopify.toast.show(receiptToast(receipt));
    if (isActivationRetry(receipt)) await shopify.saveBar.show(SAVE_BAR_ID);
    setNotice(undefined);
  };
  void show();
}

function isActivationRetry(receipt: BundleEditorReceipt): boolean {
  return receipt.kind === "quota" || receipt.kind === "component";
}

interface ClearStateInput {
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
  allowNavigation: React.MutableRefObject<boolean>;
  pending?: BundleEditorReceipt;
}

function clearReceiptState(input: ClearStateInput): void {
  if (!navigationReceipt(input.location.state) || input.pending) return;
  input.allowNavigation.current = true;
  const navigation = input.navigate(input.location.pathname, { replace: true, state: null });
  void Promise.resolve(navigation).finally(() => {
    input.allowNavigation.current = false;
  });
}

function transportValue(
  state: ReturnType<typeof useFetcher>["state"],
  pending: BundleEditorReceipt | undefined,
  feedback: EditorFeedback | undefined,
  submit: (form: FormData) => void,
  setFeedback: FeedbackSetter,
) {
  const saving = state !== "idle";
  return {
    feedback, saving, awaitingCanonical: Boolean(pending),
    uncertain: Boolean(feedback?.uncertain),
    phase: saving ? "saving" : pending ? "awaitingCanonical"
      : feedback?.uncertain ? "sync_uncertain" : "idle",
    submit,
    clearFeedback: () => setFeedback(undefined),
  };
}

type ReceiptSetter = React.Dispatch<React.SetStateAction<BundleEditorReceipt | undefined>>;
type FeedbackSetter = React.Dispatch<React.SetStateAction<EditorFeedback | undefined>>;

function resultFeedback(
  result: Exclude<BundleEditorActionData, { outcome: "accepted" }>,
): EditorFeedback {
  return {
    errors: result.errors,
    message: result.message,
    tone: result.outcome === "uncertain" ? "warning" : "critical",
    uncertain: result.outcome === "uncertain",
  };
}

function receiptFeedback(receipt: BundleEditorReceipt): EditorFeedback | undefined {
  if (["saved", "published", "paused"].includes(receipt.kind)) return undefined;
  return { errors: {}, message: receipt.message, tone: "warning", issue: receipt.kind };
}

function receiptToast(receipt: BundleEditorReceipt): string {
  return ["saved", "published", "paused"].includes(receipt.kind)
    ? receipt.message
    : "Bundle draft saved";
}

function navigationReceipt(value: unknown): BundleEditorReceipt | undefined {
  if (!isRecord(value) || !isRecord(value.editorReceipt)) return undefined;
  const receipt = value.editorReceipt;
  if (typeof receipt.bundleId !== "string") return undefined;
  if (!Number.isSafeInteger(receipt.editorRevision)) return undefined;
  if (typeof receipt.kind !== "string" || typeof receipt.message !== "string") return undefined;
  return receipt as unknown as BundleEditorReceipt;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
