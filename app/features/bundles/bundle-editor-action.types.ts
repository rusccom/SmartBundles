export type BundleEditorIssue = "quota" | "component";

export type BundleEditorActionData =
  | {
      source: "bundle-editor";
      outcome: "accepted";
      bundleId: string;
      status: "DRAFT" | "ACTIVE";
      message: string;
    }
  | {
      source: "bundle-editor";
      outcome: "rejected";
      errors: Record<string, string>;
      message?: string;
      issue?: BundleEditorIssue;
    };

export function isBundleEditorActionData(value: unknown): value is BundleEditorActionData {
  return isRecord(value) && value.source === "bundle-editor"
    && (value.outcome === "accepted" || value.outcome === "rejected");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
