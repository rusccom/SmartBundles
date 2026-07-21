import { BundleStatus, type Prisma } from "@prisma/client";
import type { AdminClient } from "../shopify/admin-api.server";
import { loadPauseBundle } from "../operations/active-bundle.server";
import { disableActiveBundle } from "../operations/disable-active-bundle.server";
import {
  completePauseRecoveryJob,
  createPauseRecoveryJob,
  enqueueBundlePause,
} from "../operations/pause-job.server";
import type { ReplacementRestoreClaim } from "../operations/replacement-quota-restore.server";
import { serializable } from "./bundle-quota.server";
import { recoverBundleSaveClaim } from "./bundle-save-recovery.server";

const BUSY_STATUSES: BundleStatus[] = [
  BundleStatus.PUBLISHING,
  BundleStatus.UPDATING,
  BundleStatus.PAUSING,
];

export interface BundlePauseClaim {
  shopId: string;
  bundleId: string;
  revision: number;
  claimVersion: number;
  recoveryJobId?: string;
}

export async function pauseBundle(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
): Promise<void> {
  const recovery = await recoverBundleSaveClaim(admin, shopId, bundleId);
  if (recovery === "WAITING") throw new Error("Bundle editor save recovery is waiting.");
  const claim = await claimManualPause(shopId, bundleId);
  if (!claim) return;
  const result = await pauseClaimedBundle(admin, claim);
  if (result === "QUEUED") throw new Error("Bundle pause was queued for retry.");
}

export async function pauseClaimedBundle(
  admin: AdminClient,
  claim: BundlePauseClaim,
  restore?: ReplacementRestoreClaim,
): Promise<"PAUSED" | "QUEUED"> {
  const active = await loadPauseBundle(claim.bundleId, claim.revision);
  if (!active || active.bundle.shopId !== claim.shopId) throw new Error("Pause claim is stale.");
  assertPauseFence(active.bundle, claim);
  try {
    await disableActiveBundle(admin, active, { status: "PAUSED" });
    if (claim.recoveryJobId) await completePauseRecoveryJob(claim.recoveryJobId);
    return "PAUSED";
  } catch {
    if (!claim.recoveryJobId) await enqueueClaimedPause(claim, restore);
    return "QUEUED";
  }
}

function assertPauseFence(
  bundle: { status: string; lockVersion: number },
  claim: BundlePauseClaim,
): void {
  if (bundle.status !== "PAUSING" || bundle.lockVersion !== claim.claimVersion) {
    throw new Error("Pause claim is stale.");
  }
}

async function claimManualPause(
  shopId: string,
  bundleId: string,
): Promise<BundlePauseClaim | null> {
  return serializable(async (tx) => {
    const bundle = await pauseTarget(tx, shopId, bundleId);
    if (bundle.status === BundleStatus.PAUSED && !bundle.runtimeEnabled) return null;
    if (BUSY_STATUSES.includes(bundle.status) || bundle.editorSaveToken) {
      throw new Error("Another bundle operation is in progress.");
    }
    const revision = bundle.activeRevision ?? bundle.draftRevision;
    if (!revision) throw new Error("Bundle has no revision to pause.");
    await markPausing(tx, shopId, bundle);
    const claim = { shopId, bundleId, revision, claimVersion: bundle.lockVersion + 1 };
    const recoveryJobId = await createPauseRecoveryJob(tx, pauseJobInput(claim));
    return { ...claim, recoveryJobId };
  });
}

function pauseTarget(
  tx: Prisma.TransactionClient,
  shopId: string,
  bundleId: string,
) {
  return tx.bundle.findFirstOrThrow({
    where: { id: bundleId, shopId },
    select: {
      id: true,
      status: true,
      runtimeEnabled: true,
      activeRevision: true,
      draftRevision: true,
      lockVersion: true,
      editorSaveToken: true,
    },
  });
}

async function markPausing(
  tx: Prisma.TransactionClient,
  shopId: string,
  bundle: Awaited<ReturnType<typeof pauseTarget>>,
): Promise<void> {
  const updated = await tx.bundle.updateMany({
    where: {
      id: bundle.id, shopId, status: bundle.status,
      lockVersion: bundle.lockVersion, editorSaveToken: null,
    },
    data: {
      status: "PAUSING",
      lockVersion: { increment: 1 },
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  });
  if (updated.count !== 1) throw new Error("Concurrent bundle operation detected.");
}

function enqueueClaimedPause(
  claim: BundlePauseClaim,
  restore?: ReplacementRestoreClaim,
): Promise<void> {
  return enqueueBundlePause(pauseJobInput(claim, restore));
}

function pauseJobInput(
  claim: BundlePauseClaim,
  restore?: ReplacementRestoreClaim,
) {
  return {
    shopId: claim.shopId,
    bundleId: claim.bundleId,
    revision: claim.revision,
    lockVersion: claim.claimVersion,
    restore,
  };
}
