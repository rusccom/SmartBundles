import { randomUUID } from "node:crypto";
import { PublicationJobType } from "@prisma/client";
import prisma from "../../db.server";

const JOB_BATCH_SIZE = 8;
export const JOB_LEASE_MS = 3 * 60_000;
const BASE_BACKOFF_MS = 30_000;

export interface LeasedPublicationJob {
  id: string;
  shopId: string;
  bundleId: string | null;
  type: "PUBLISH" | "RECONCILE" | "PAUSE";
  payload: unknown;
  attempts: number;
  leaseToken: string;
  shop: { domain: string };
}

export interface JobLeaseOwnership {
  job: LeasedPublicationJob;
  lost: boolean;
}

const OWNERSHIP_LOST = "JOB_LEASE_OWNERSHIP_LOST";

export function createJobOwnership(job: LeasedPublicationJob): JobLeaseOwnership {
  return { job, lost: false };
}

export async function loadJobOwnership(
  id: string,
  leaseToken: string,
): Promise<JobLeaseOwnership> {
  const job = await loadClaimed(id, leaseToken);
  if (!job) throw ownershipLostError();
  return createJobOwnership(job);
}

export function markJobOwnershipLost(ownership: JobLeaseOwnership): void {
  ownership.lost = true;
}

export function rejectJobOwnership(ownership: JobLeaseOwnership): never {
  markJobOwnershipLost(ownership);
  throw ownershipLostError();
}

export function isJobOwnershipLost(error: unknown): boolean {
  return error instanceof Error && error.name === OWNERSHIP_LOST;
}

export async function renewJobOwnership(ownership: JobLeaseOwnership): Promise<boolean> {
  if (ownership.lost) return false;
  try {
    const renewed = await renewJobLease(ownership.job);
    if (!renewed) markJobOwnershipLost(ownership);
    return renewed;
  } catch {
    rejectJobOwnership(ownership);
  }
}

export async function assertJobOwnership(ownership: JobLeaseOwnership): Promise<void> {
  if (ownership.lost || !await renewJobOwnership(ownership)) rejectJobOwnership(ownership);
}

function ownershipLostError(): Error {
  const error = new Error("Publication job lease ownership was lost.");
  error.name = OWNERSHIP_LOST;
  return error;
}

export async function claimPublicationJobs(): Promise<LeasedPublicationJob[]> {
  const now = new Date();
  const candidates = await prisma.publicationJob.findMany({
    where: dueWhere(now),
    select: { id: true, attempts: true },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: JOB_BATCH_SIZE * 2,
  });
  const leased: LeasedPublicationJob[] = [];
  for (const candidate of candidates) {
    if (leased.length === JOB_BATCH_SIZE) break;
    const job = await claimCandidate(candidate, now);
    if (job) leased.push(job);
  }
  return leased;
}

function dueWhere(now: Date) {
  return {
    AND: [dueState(now), retryableType()],
  };
}

function retryableType() {
  return { type: { in: [
    PublicationJobType.PUBLISH,
    PublicationJobType.RECONCILE,
    PublicationJobType.PAUSE,
  ] } };
}

function dueState(now: Date) {
  return {
    OR: [
      { state: "PENDING" as const, nextAttemptAt: { lte: now } },
      { state: "RUNNING" as const, leaseUntil: { lte: now } },
    ],
  };
}

async function claimCandidate(
  candidate: { id: string; attempts: number },
  now: Date,
): Promise<LeasedPublicationJob | null> {
  const leaseToken = randomUUID();
  const claimed = await prisma.publicationJob.updateMany({
    where: claimWhere(candidate, now),
    data: claimData(leaseToken, now),
  });
  if (!claimed.count) return null;
  return loadClaimed(candidate.id, leaseToken);
}

function claimWhere(candidate: { id: string; attempts: number }, now: Date) {
  return {
    id: candidate.id,
    attempts: candidate.attempts,
    AND: [dueState(now), retryableType()],
  };
}

function claimData(leaseToken: string, now: Date) {
  return {
    state: "RUNNING" as const,
    step: "reconciling",
    attempts: { increment: 1 },
    leaseToken,
    leaseUntil: new Date(now.getTime() + JOB_LEASE_MS),
    lastError: null,
  };
}

async function loadClaimed(id: string, leaseToken: string): Promise<LeasedPublicationJob | null> {
  const job = await prisma.publicationJob.findFirst({
    where: { id, state: "RUNNING", leaseToken },
    select: {
      id: true, shopId: true, bundleId: true, type: true, payload: true,
      attempts: true, leaseToken: true, shop: { select: { domain: true } },
    },
  });
  if (!job?.leaseToken) return null;
  if (job.type !== "PUBLISH" && job.type !== "RECONCILE" && job.type !== "PAUSE") return null;
  return { ...job, type: job.type, leaseToken: job.leaseToken };
}

export async function renewJobLease(job: LeasedPublicationJob): Promise<boolean> {
  const now = new Date();
  const renewed = await prisma.publicationJob.updateMany({
    where: {
      id: job.id, state: "RUNNING", leaseToken: job.leaseToken,
      leaseUntil: { gt: now },
    },
    data: { leaseUntil: new Date(now.getTime() + JOB_LEASE_MS) },
  });
  return renewed.count === 1;
}

export function completeJob(job: LeasedPublicationJob, step: string) {
  return prisma.publicationJob.updateMany({
    where: { id: job.id, state: "RUNNING", leaseToken: job.leaseToken },
    data: { state: "COMPLETED", step, leaseUntil: null, leaseToken: null, lastError: null },
  });
}

export function retryJob(job: LeasedPublicationJob, error: unknown) {
  return prisma.publicationJob.updateMany({
    where: { id: job.id, state: "RUNNING", leaseToken: job.leaseToken },
    data: retryData(job, error),
  });
}

function retryData(job: LeasedPublicationJob, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown reconciliation error";
  return {
    state: "PENDING" as const,
    step: "retry_wait",
    nextAttemptAt: new Date(Date.now() + backoffMs(job.attempts)),
    leaseUntil: null,
    leaseToken: null,
    lastError: message,
  };
}

function backoffMs(attempt: number): number {
  return Math.min(60 * 60_000, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1));
}
