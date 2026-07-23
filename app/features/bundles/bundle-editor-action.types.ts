export type BundleEditorReceiptKind =
  | "saved"
  | "published"
  | "paused"
  | "quota"
  | "component"
  | "sync";

export interface BundleEditorReceipt {
  bundleId: string;
  editorRevision: number;
  kind: BundleEditorReceiptKind;
  message: string;
}

export type BundleEditorActionData =
  | { outcome: "accepted"; receipt: BundleEditorReceipt }
  | { outcome: "rejected"; errors: Record<string, string>; message?: string }
  | { outcome: "uncertain"; errors: Record<string, string>; message: string };
