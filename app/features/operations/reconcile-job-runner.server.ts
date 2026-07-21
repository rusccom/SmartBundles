import { BundleStatus } from "@prisma/client";
import prisma from "../../db.server";
import { unauthenticated } from "../../shopify.server";
import type { AdminClient } from "../shopify/admin-api.server";
import { ensureShopContext } from "../installation/shop-context.server";
import { resumeActivationJob } from "../bundles/bundle-activation.server";
import { recoverBundleSaveClaim } from "../bundles/bundle-save-recovery.server";
import { loadPauseBundle } from "./active-bundle.server";
import type { ActiveBundle } from "./active-bundle.server";
import { disableActiveBundle } from "./disable-active-bundle.server";
import {
  assertJobOwnership,
  claimPublicationJobs,
  completeJob,
  createJobOwnership,
  isJobOwnershipLost,
  markJobOwnershipLost,
  rejectJobOwnership,
  renewJobOwnership,
  retryJob,
} from "./publication-job-lease.server";
import type {
  JobLeaseOwnership,
  LeasedPublicationJob,
} from "./publication-job-lease.server";
import {
  createOperationGuard,
  guardAdminClient,
} from "./operation-claim-guard.server";
import type { OperationGuard } from "./operation-claim-guard.server";
import { reconcileActiveBundle } from "./reconcile-active-bundle.server";
import {
  claimReconciliation,
  reconciliationClaimVersion,
} from "./reconcile-claim.server";
import {
  restoreReplacementQuota,
} from "./replacement-quota-restore.server";
import type { ReplacementRestoreClaim } from "./replacement-quota-restore.server";

const HEARTBEAT_MS = 30_000;
const MAX_JOB_ATTEMPTS = 5;

export interface PublicationJobSummary {
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
}

export async function runPublicationJobs(): Promise<PublicationJobSummary> {
  const jobs = await claimPublicationJobs();
  const ownerships = jobs.map(createJobOwnership);
  const timers = ownerships.map(startHeartbeat);
  const summary = { claimed: jobs.length, completed: 0, retried: 0, failed: 0 };
  for (let index = 0; index < jobs.length; index += 1) {
    await processJob(ownerships[index], timers[index], summary);
  }
  return summary;
}

async function processJob(
  ownership: JobLeaseOwnership,
  timer: ReturnType<typeof setInterval>,
  summary: PublicationJobSummary,
): Promise<void> {
  const { job } = ownership;
  try {
    await assertJobOwnership(ownership);
    if (!job.bundleId) return await complete(ownership, "skipped", summary);
    const { admin } = await unauthenticated.admin(job.shop.domain);
    const result = await performJob(admin, job, ownership);
    await complete(ownership, result.toLowerCase(), summary);
  } catch (error) {
    await settleFailure(ownership, error, summary);
  } finally {
    clearInterval(timer);
  }
}

async function performJob(
  admin: AdminClient,
  job: LeasedPublicationJob,
  ownership: JobLeaseOwnership,
) {
  if (job.type === "RECONCILE") return performReconcileJob(admin, job, ownership);
  if (job.type === "PUBLISH") return resumeActivationJob(leaseAdmin(admin, ownership), {
    shopId: job.shopId,
    bundleId: job.bundleId!,
    payload: job.payload,
    attempts: job.attempts,
  });
  return performPauseJob(admin, job, ownership);
}

async function performReconcileJob(
  admin: AdminClient,
  job: LeasedPublicationJob,
  ownership: JobLeaseOwnership,
) {
  await ensureShopContext(admin, job.shop.domain);
  const recovery = await recoverBundleSaveClaim(admin, job.shopId, job.bundleId!);
  if (recovery === "WAITING") throw new Error("Bundle editor save recovery is waiting.");
  const claimVersion = await claimReconciliation(job);
  if (!claimVersion || !job.bundleId) return "SKIPPED" as const;
  const guard = reconcileGuard(ownership, job.bundleId, claimVersion);
  await guard();
  return reconcileActiveBundle(admin, job.bundleId, claimVersion, guard);
}

async function performPauseJob(
  admin: AdminClient,
  job: LeasedPublicationJob,
  ownership: JobLeaseOwnership,
) {
  const payload = pausePayload(job.payload);
  if (!payload) return "SKIPPED" as const;
  const active = await loadPauseBundle(job.bundleId!, payload.revision);
  if (!active) return "SKIPPED" as const;
  const fence = pauseFence(active, payload);
  if (fence === "STALE") return "SKIPPED" as const;
  if (fence === "READY") await guardedPause(admin, active, payload, ownership);
  await assertJobOwnership(ownership);
  if (payload.restore) {
    await restoreReplacementQuota(job.shopId, job.bundleId!, payload.restore);
  }
  return "PAUSED" as const;
}

function leaseAdmin(admin: AdminClient, ownership: JobLeaseOwnership): AdminClient {
  return guardAdminClient(admin, () => assertJobOwnership(ownership));
}

function reconcileGuard(
  ownership: JobLeaseOwnership,
  bundleId: string,
  lockVersion: number,
): OperationGuard {
  return createOperationGuard(ownership, {
    bundleId,
    lockVersion,
    statuses: [BundleStatus.UPDATING],
  });
}

async function guardedPause(
  admin: AdminClient,
  active: ActiveBundle,
  payload: PausePayload,
  ownership: JobLeaseOwnership,
): Promise<void> {
  const guard = createOperationGuard(ownership, {
    bundleId: active.bundle.id,
    lockVersion: payload.lockVersion,
    statuses: [BundleStatus.PAUSING],
  });
  await guard();
  await disableActiveBundle(admin, active, { status: "PAUSED" }, guard);
}

interface PausePayload {
  revision: number;
  lockVersion: number;
  restore?: ReplacementRestoreClaim;
}

function pausePayload(value: unknown): PausePayload | null {
  if (!isRecord(value)) return null;
  if (typeof value.revision !== "number" || typeof value.lockVersion !== "number") return null;
  const base = { revision: value.revision, lockVersion: value.lockVersion };
  if (value.restore === undefined) return base;
  const restore = parseRestore(value.restore);
  return restore ? { ...base, restore } : null;
}

function parseRestore(value: unknown): ReplacementRestoreClaim | null {
  if (!isRecord(value) || typeof value.bundleId !== "string") return null;
  if (!Number.isSafeInteger(value.claimVersion) || Number(value.claimVersion) < 1) return null;
  if (!isBundleStatus(value.previousStatus)) return null;
  return {
    bundleId: value.bundleId,
    claimVersion: Number(value.claimVersion),
    previousStatus: value.previousStatus,
  };
}

function isBundleStatus(value: unknown): value is BundleStatus {
  return typeof value === "string" && Object.values(BundleStatus).includes(value as BundleStatus);
}

function pauseFence(active: ActiveBundle, payload: PausePayload): "READY" | "DISABLED" | "STALE" {
  if (payload.revision !== active.revision.revision) return "STALE";
  if (payload.lockVersion === active.bundle.lockVersion) return "READY";
  const disabled = active.bundle.lockVersion === payload.lockVersion + 1 && !active.bundle.runtimeEnabled;
  return disabled ? "DISABLED" : "STALE";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function complete(
  ownership: JobLeaseOwnership,
  step: string,
  summary: PublicationJobSummary,
): Promise<void> {
  await assertJobOwnership(ownership);
  const completed = await completeJob(ownership.job, step);
  if (completed.count !== 1) rejectJobOwnership(ownership);
  markJobOwnershipLost(ownership);
  summary.completed += 1;
}

async function settleFailure(
  ownership: JobLeaseOwnership,
  error: unknown,
  summary: PublicationJobSummary,
): Promise<void> {
  if (isJobOwnershipLost(error)) return;
  try {
    await handleFailure(ownership, error, summary);
  } catch (settleError) {
    if (!isJobOwnershipLost(settleError)) throw settleError;
  }
}

async function handleFailure(
  ownership: JobLeaseOwnership,
  error: unknown,
  summary: PublicationJobSummary,
): Promise<void> {
  await assertJobOwnership(ownership);
  const { job } = ownership;
  if (job.type === "PAUSE") await handlePauseRetry(job, error, summary);
  else if (job.type === "PUBLISH") handlePublishRetry(job, summary);
  else await handleReconcileRetry(job, error, summary);
  const retried = await retryJob(job, error);
  if (retried.count !== 1) rejectJobOwnership(ownership);
  markJobOwnershipLost(ownership);
}

function handlePublishRetry(
  job: LeasedPublicationJob,
  summary: PublicationJobSummary,
): void {
  summary.retried += 1;
  if (job.attempts >= MAX_JOB_ATTEMPTS) summary.failed += 1;
}

async function handleReconcileRetry(
  job: LeasedPublicationJob,
  error: unknown,
  summary: PublicationJobSummary,
): Promise<void> {
  summary.retried += 1;
  if (job.attempts < MAX_JOB_ATTEMPTS) return;
  summary.failed += 1;
  const claimVersion = reconciliationClaimVersion(job.payload);
  if (!claimVersion || !job.bundleId) return;
  const message = error instanceof Error ? error.message.slice(0, 1_000) : "Reconciliation is retrying.";
  await prisma.bundle.updateMany({
    where: { id: job.bundleId, status: "UPDATING", lockVersion: claimVersion },
    data: { health: "NEEDS_ATTENTION", lastErrorCode: "RECONCILE_RETRYING", lastErrorMessage: message },
  });
}

async function handlePauseRetry(
  job: LeasedPublicationJob,
  error: unknown,
  summary: PublicationJobSummary,
): Promise<void> {
  summary.retried += 1;
  if (job.attempts < MAX_JOB_ATTEMPTS || !job.bundleId) return;
  await recordPauseRetry(job, error);
}

function recordPauseRetry(job: LeasedPublicationJob, error: unknown) {
  const payload = pausePayload(job.payload);
  if (!payload || !job.bundleId) return Promise.resolve();
  const message = error instanceof Error ? error.message.slice(0, 1_000) : "Bundle pause is retrying.";
  return prisma.bundle.updateMany({
    where: { id: job.bundleId, status: "PAUSING", lockVersion: payload.lockVersion },
    data: { health: "NEEDS_ATTENTION", lastErrorCode: "PAUSE_RETRYING", lastErrorMessage: message },
  });
}

function startHeartbeat(ownership: JobLeaseOwnership): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    void renewJobOwnership(ownership).catch(() => undefined);
  }, HEARTBEAT_MS);
  timer.unref();
  return timer;
}
