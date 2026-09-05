import { useCallback, useEffect, useMemo, useState } from "react";
import type { StorefrontTexts } from "../../settings/storefront-text.types";
import type { ShopifyProductImage } from "../content/content.types";
import type { BundleEditorDraft } from "../editor/editor.types";
import { bundlePreviewConfig } from "./bundle-preview-config";
import type { BundlePreviewMode } from "./bundle-preview-document";
import {
  bootstrapPreviewFrame, previewDocument, previewHost, previewNotice,
} from "./bundle-preview-document";

const EMPTY_NOTICE = "Add components and a price to preview the bundle.";

export interface BundlePreviewInput {
  draft: BundleEditorDraft;
  currencyCode: string;
  image: ShopifyProductImage | null;
  locale: string;
  texts: StorefrontTexts;
}

export function useBundlePreview(
  frame: React.RefObject<HTMLIFrameElement | null>,
  input: BundlePreviewInput,
  mode: BundlePreviewMode,
) {
  const [ready, setReady] = useState(false);
  const source = useMemo(() => previewDocument(input.locale, mode), [input.locale, mode]);
  const load = useCallback(() => {
    setReady(frame.current ? bootstrapPreviewFrame(frame.current) : false);
  }, [frame]);
  usePreviewProduct(frame, ready, input.draft.title, input.image);
  useBundleHost(frame, ready, input, previewConfigKey(input));
  return { load, source };
}

function previewConfigKey(input: BundlePreviewInput): string {
  const config = bundlePreviewConfig(input.draft, input.currencyCode, input.texts, input.locale);
  return config ? JSON.stringify(config) : "";
}

function usePreviewProduct(
  frame: React.RefObject<HTMLIFrameElement | null>,
  ready: boolean,
  title: string,
  image: ShopifyProductImage | null,
): void {
  useEffect(() => {
    const titleNode = previewSlot(frame.current, "[data-preview-title]");
    if (titleNode) titleNode.textContent = title;
    syncPreviewImage(previewImage(frame.current), image);
  }, [frame, image, ready, title]);
}

function syncPreviewImage(node: HTMLImageElement | null, image: ShopifyProductImage | null): void {
  if (!node) return;
  node.closest(".sbp")?.classList.toggle("sbp--without-image", !image);
  node.hidden = !image;
  if (!image) return node.removeAttribute("src");
  node.src = image.url;
  node.alt = image.altText ?? "";
  node.width = image.width;
  node.height = image.height;
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

function previewImage(frame: HTMLIFrameElement | null): HTMLImageElement | null {
  return frame?.contentDocument?.querySelector("[data-preview-image]") ?? null;
}
