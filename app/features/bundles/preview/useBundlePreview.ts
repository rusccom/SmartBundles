import { useCallback, useEffect, useMemo, useState } from "react";
import { sanitizeDescriptionClient } from "../../rich-text/description/description-sanitize.client";
import type { StorefrontTexts } from "../../settings/storefront-text.types";
import type { BundleEditorDraft } from "../editor/editor.types";
import { bundlePreviewConfig } from "./bundle-preview-config";
import {
  bootstrapPreviewFrame, previewDocument, previewHost, previewNotice,
} from "./bundle-preview-document";

const EMPTY_NOTICE = "Add components and a price to preview the bundle.";

export interface BundlePreviewInput {
  draft: BundleEditorDraft;
  currencyCode: string;
  locale: string;
  texts: StorefrontTexts;
}

export function useBundlePreview(
  frame: React.RefObject<HTMLIFrameElement | null>,
  input: BundlePreviewInput,
) {
  const [ready, setReady] = useState(false);
  const source = useMemo(() => previewDocument(input.locale), [input.locale]);
  const load = useCallback(() => {
    setReady(frame.current ? bootstrapPreviewFrame(frame.current) : false);
  }, [frame]);
  usePreviewContent(frame, ready, input);
  useBundleHost(frame, ready, input, previewConfigKey(input));
  return { load, source };
}

function previewConfigKey(input: BundlePreviewInput): string {
  const config = bundlePreviewConfig(input.draft, input.currencyCode, input.texts);
  return config ? JSON.stringify(config) : "";
}

function usePreviewContent(
  frame: React.RefObject<HTMLIFrameElement | null>,
  ready: boolean,
  input: BundlePreviewInput,
): void {
  const { descriptionHtml, title } = input.draft;
  useEffect(() => {
    const node = previewSlot(frame.current, "[data-preview-title]");
    if (node) node.textContent = title;
  }, [frame, ready, title]);
  useEffect(() => {
    const node = previewSlot(frame.current, "[data-preview-description]");
    if (node) node.innerHTML = sanitizeDescriptionClient(descriptionHtml);
  }, [descriptionHtml, frame, ready]);
}

function useBundleHost(
  frame: React.RefObject<HTMLIFrameElement | null>,
  ready: boolean,
  input: BundlePreviewInput,
  configKey: string,
): void {
  const { locale } = input;
  useEffect(() => {
    const slot = previewSlot(frame.current, "[data-preview-bundle]");
    const frameDocument = slot?.ownerDocument;
    if (!slot || !frameDocument) return;
    slot.replaceChildren(configKey
      ? previewHost(frameDocument, JSON.parse(configKey), locale)
      : previewNotice(frameDocument, EMPTY_NOTICE));
  }, [configKey, frame, locale, ready]);
}

function previewSlot(frame: HTMLIFrameElement | null, selector: string): HTMLElement | null {
  return frame?.contentDocument?.querySelector(selector) ?? null;
}
