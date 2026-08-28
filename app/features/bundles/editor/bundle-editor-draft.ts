import { initialEditorSelectors, serializedSelectors } from "./editor-state";
import { appendBundleMedia, mediaDraftFingerprint } from "./bundle-media-draft";
import type { BundleEditorDraft, BundleEditorInitial } from "./editor.types";

export function initialBundleEditorDraft(initial: BundleEditorInitial): BundleEditorDraft {
  return {
    title: initial.title,
    descriptionHtml: initial.descriptionHtml,
    media: { kind: "keep", image: initial.image },
    desiredStatus: initial.status,
    pricingMode: initial.pricingMode,
    fixedPrice: initial.fixedPrice,
    discountPercent: initial.discountPercent,
    selectors: initialEditorSelectors(initial.selectors),
  };
}

export function bundleEditorDraftEqual(
  left: BundleEditorDraft,
  right: BundleEditorDraft,
): boolean {
  return draftFingerprint(left) === draftFingerprint(right);
}

export function bundleEditorFormData(
  initial: BundleEditorInitial,
  baseline: BundleEditorDraft,
  draft: BundleEditorDraft,
): FormData {
  const form = new FormData();
  appendIdentity(form, initial);
  appendContent(form, initial.id, baseline, draft);
  appendBundleMedia(form, baseline.media, draft.media);
  appendBundle(form, draft);
  form.set("configurationDirty", configurationChanged(initial.id, baseline, draft) ? "yes" : "no");
  form.set("storedConfigurationDirty", storedConfigurationChanged(initial.id, baseline, draft) ? "yes" : "no");
  return form;
}

function appendIdentity(form: FormData, initial: BundleEditorInitial): void {
  form.set("creationToken", initial.creationToken ?? "");
}

function appendContent(
  form: FormData,
  id: string | undefined,
  baseline: BundleEditorDraft,
  draft: BundleEditorDraft,
): void {
  if (!id || baseline.title !== draft.title) form.set("title", draft.title);
  if (!id || baseline.descriptionHtml !== draft.descriptionHtml) {
    form.set("descriptionHtml", draft.descriptionHtml);
  }
}

function appendBundle(form: FormData, draft: BundleEditorDraft): void {
  form.set("desiredStatus", draft.desiredStatus);
  form.set("pricingMode", draft.pricingMode);
  form.set("fixedPrice", draft.fixedPrice);
  form.set("discountPercent", draft.discountPercent);
  form.set("selectors", serializedSelectors(draft.selectors));
}

function configurationChanged(
  id: string | undefined,
  baseline: BundleEditorDraft,
  draft: BundleEditorDraft,
): boolean {
  if (!id) return true;
  return JSON.stringify(configurationValue(baseline)) !== JSON.stringify(configurationValue(draft));
}

function configurationValue(draft: BundleEditorDraft) {
  return {
    ...storedConfigurationValue(draft),
    fixedPrice: draft.fixedPrice,
  };
}

function storedConfigurationChanged(
  id: string | undefined,
  baseline: BundleEditorDraft,
  draft: BundleEditorDraft,
): boolean {
  if (!id) return true;
  return JSON.stringify(storedConfigurationValue(baseline))
    !== JSON.stringify(storedConfigurationValue(draft));
}

function storedConfigurationValue(draft: BundleEditorDraft) {
  return {
    pricingMode: draft.pricingMode, discountPercent: draft.discountPercent,
    selectors: serializedSelectors(draft.selectors),
  };
}

function draftFingerprint(draft: BundleEditorDraft): string {
  return JSON.stringify({
    ...draft,
    media: mediaDraftFingerprint(draft.media),
    selectors: serializedSelectors(draft.selectors),
  });
}
