import { type BundleStatus, type Prisma } from "@prisma/client";
import prisma from "../../db.server";
import { isStorefrontTextSyncPayload } from "../settings/storefront-text-sync.server";
import type { LeasedPublicationJob } from "./publication-job-lease.server";

const CLAIM_KEY = "reconcileClaimVersion";

export async function claimReconciliation(
  job: LeasedPublicationJob,
): Promise<number | null> {
  const existing = reconciliationClaimVersion(job.payload);
  if (existing) return await validExistingClaim(job.bundleId, existing) ? existing : null;
  if (!job.bundleId) return null;
  return prisma.$transaction((tx) => createClaim(tx, job));
}

async function validExistingClaim(
  bundleId: string | null,
  version: number,
): Promise<boolean> {
  if (!bundleId) return false;
  const count = await prisma.bundle.count({
    where: { id: bundleId, status: "UPDATING", lockVersion: version },
  });
  return count === 1;
}

async function createClaim(
  tx: Prisma.TransactionClient,
  job: LeasedPublicationJob,
): Promise<number | null> {
  const bundle = await reconciliationTarget(tx, job.bundleId!);
  if (!bundle?.activeRevision || !bundle.countsTowardQuota) return null;
  if (bundle.status === "ARCHIVED") return null;
  if (bundle.editorSaveToken) throw new Error("Bundle editor save is in progress.");
  if (["PUBLISHING", "UPDATING", "PAUSING"].includes(bundle.status)) {
    if (isStorefrontTextSyncPayload(job.payload)) {
      throw new Error("Bundle operation is in progress.");
    }
    return null;
  }
  const version = bundle.lockVersion + 1;
  await claimBundle(tx, job.bundleId!, bundle.status, bundle.lockVersion);
  await persistJobClaim(tx, job, version);
  return version;
}

function reconciliationTarget(tx: Prisma.TransactionClient, bundleId: string) {
  return tx.bundle.findUnique({
    where: { id: bundleId },
    select: {
      status: true,
      lockVersion: true,
      activeRevision: true,
      countsTowardQuota: true,
      editorSaveToken: true,
    },
  });
}

async function claimBundle(
  tx: Prisma.TransactionClient,
  bundleId: string,
  status: BundleStatus,
  lockVersion: number,
): Promise<void> {
  const claimed = await tx.bundle.updateMany({
    where: { id: bundleId, status, lockVersion, editorSaveToken: null },
    data: { status: "UPDATING", lockVersion: { increment: 1 } },
  });
  if (claimed.count !== 1) throw new Error("Concurrent reconciliation detected.");
}

async function persistJobClaim(
  tx: Prisma.TransactionClient,
  job: LeasedPublicationJob,
  version: number,
): Promise<void> {
  const payload = { ...payloadRecord(job.payload), [CLAIM_KEY]: version };
  const updated = await tx.publicationJob.updateMany({
    where: { id: job.id, state: "RUNNING", leaseToken: job.leaseToken },
    data: { payload: payload as Prisma.InputJsonValue, step: "reconciling" },
  });
  if (updated.count !== 1) throw new Error("Reconciliation lease expired.");
}

export function reconciliationClaimVersion(value: unknown): number | null {
  const version = payloadRecord(value)[CLAIM_KEY];
  return Number.isSafeInteger(version) && Number(version) > 0 ? Number(version) : null;
}

function payloadRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
