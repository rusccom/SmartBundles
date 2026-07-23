import type { BundleDesiredStatus } from "../bundle.types";

const ACTIVE_STATUSES = new Set([
  "ACTIVE",
  "PUBLISHING",
  "UPDATING",
]);

const BUSY_STATUSES = new Set([
  "PUBLISHING",
  "UPDATING",
  "PAUSING",
]);

export function desiredStatus(status: string): BundleDesiredStatus {
  return ACTIVE_STATUSES.has(status) ? "ACTIVE" : "DRAFT";
}

export function isBundleOperationBusy(status: string): boolean {
  return BUSY_STATUSES.has(status);
}
