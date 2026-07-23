import { desiredStatus } from "./bundle-editor-status";
import { initialEditorSelectors, serializedSelectors } from "./editor-state";
import type { BundleEditorDraft, BundleEditorInitial } from "./editor.types";

export function initialBundleEditorDraft(initial: BundleEditorInitial): BundleEditorDraft {
  return {
    title: initial.title,
    descriptionHtml: initial.descriptionHtml,
    descriptionDirty: false,
    desiredStatus: desiredStatus(initial.status),
    pricingMode: initial.pricingMode,
    fixedPrice: initial.fixedPrice,
    discountPercent: initial.discountPercent,
    selectors: initialEditorSelectors(initial.selectors),
    replacementId: "",
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
  draft: BundleEditorDraft,
): FormData {
  const form = new FormData();
  appendIdentity(form, initial);
  appendContent(form, draft);
  appendBundle(form, draft);
  return form;
}

function appendIdentity(form: FormData, initial: BundleEditorInitial): void {
  form.set("bundleVersion", initial.version);
  form.set("contentVersionToken", initial.contentVersionToken ?? "");
  form.set("creationToken", initial.creationToken ?? "");
}

function appendContent(form: FormData, draft: BundleEditorDraft): void {
  form.set("title", draft.title);
  form.set("descriptionHtml", draft.descriptionHtml);
  form.set("descriptionDirty", draft.descriptionDirty ? "yes" : "no");
}

function appendBundle(form: FormData, draft: BundleEditorDraft): void {
  form.set("desiredStatus", draft.desiredStatus);
  form.set("pricingMode", draft.pricingMode);
  form.set("fixedPrice", draft.fixedPrice);
  form.set("discountPercent", draft.discountPercent);
  form.set("selectors", serializedSelectors(draft.selectors));
  form.set("replacementId", draft.replacementId);
}

function draftFingerprint(draft: BundleEditorDraft): string {
  return JSON.stringify({
    ...draft,
    selectors: serializedSelectors(draft.selectors),
  });
}
