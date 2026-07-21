import type { AdminClient } from "../shopify/admin-api.server";
import { guardAdminClient } from "./operation-claim-guard.server";
import {
  assertJobOwnership,
  completeJob,
  loadJobOwnership,
  markJobOwnershipLost,
  renewJobOwnership,
  retryJob,
} from "./publication-job-lease.server";
import type { JobLeaseOwnership } from "./publication-job-lease.server";

const HEARTBEAT_MS = 30_000;

type OwnedAction<T> = (
  admin: AdminClient,
  assertOwned: () => Promise<void>,
) => Promise<T>;

export async function runWithPublicationJobOwnership<T>(
  jobId: string,
  leaseToken: string,
  admin: AdminClient,
  action: OwnedAction<T>,
): Promise<T> {
  const ownership = await loadJobOwnership(jobId, leaseToken);
  const timer = startHeartbeat(ownership);
  try {
    return await runOwnedAction(ownership, admin, action);
  } finally {
    clearInterval(timer);
  }
}

async function runOwnedAction<T>(
  ownership: JobLeaseOwnership,
  admin: AdminClient,
  action: OwnedAction<T>,
): Promise<T> {
  const assertOwned = () => assertJobOwnership(ownership);
  try {
    await assertOwned();
    const result = await action(guardAdminClient(admin, assertOwned), assertOwned);
    await assertOwned();
    await completeOwnedJob(ownership);
    return result;
  } catch (error) {
    await releaseOwnedJob(ownership, error);
    throw error;
  }
}

async function completeOwnedJob(ownership: JobLeaseOwnership): Promise<void> {
  const completed = await completeJob(ownership.job, "published");
  markJobOwnershipLost(ownership);
  if (completed.count !== 1) throw ownershipLostError();
}

async function releaseOwnedJob(
  ownership: JobLeaseOwnership,
  error: unknown,
): Promise<void> {
  try {
    await retryJob(ownership.job, error);
  } catch {
    // Lease expiry remains the recovery fallback when the release cannot be persisted.
  }
  markJobOwnershipLost(ownership);
}

function startHeartbeat(ownership: JobLeaseOwnership): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    void renewJobOwnership(ownership).catch(() => undefined);
  }, HEARTBEAT_MS);
  timer.unref();
  return timer;
}

function ownershipLostError(): Error {
  const error = new Error("Synchronous publication job ownership was lost.");
  error.name = "JOB_LEASE_OWNERSHIP_LOST";
  return error;
}
