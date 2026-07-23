import { randomUUID } from "node:crypto";
import { BundleStatus, Plan, type Prisma } from "@prisma/client";
import { getBillingState } from "../billing/index.server";
import { JOB_LEASE_MS } from "../operations/publication-job-lease.server";
import { clearedBundleSaveClaim } from "./bundle-save-claim.server";
import {
  FREE_ACTIVE_BUNDLE_LIMIT,
  QuotaExceededError,
  serializable,
} from "./bundle-quota.server";

const RECOVERY_DELAY_MS = 5 * 60_000;
const BUSY_STATUSES: BundleStatus[] = [
  BundleStatus.PUBLISHING,
  BundleStatus.UPDATING,
  BundleStatus.PAUSING,
];

export interface ClaimedBundleOperation {
  id: string;
  revision: number;
  claimVersion: number;
  previousStatus: BundleStatus;
  wasReserved: boolean;
  hadActiveRevision: boolean;
}

export interface ActivationClaim {
  target: ClaimedBundleOperation;
  replacement?: ClaimedBundleOperation;
  recoveryJobId: string;
  recoveryLeaseToken: string;
}

export type ActivationRecovery = Omit<ActivationClaim, "recoveryJobId" | "recoveryLeaseToken">;

export interface ActivationClaimInput {
  shopId: string;
  bundleId: string;
  revision: number;
  lockVersion: number;
  replacedBundleId?: string;
  editorSaveToken?: string;
}

interface ClaimRecord {
  id: string;
  status: BundleStatus;
  lockVersion: number;
  countsTowardQuota: boolean;
  activeRevision: number | null;
  draftRevision: number | null;
  editorSaveToken: string | null;
}

export async function claimActivation(input: ActivationClaimInput): Promise<ActivationClaim> {
  if (input.bundleId === input.replacedBundleId) throw new Error("A bundle cannot replace itself.");
  const billing = await getBillingState(input.shopId, "quota");
  return serializable((tx) => claimInTransaction(tx, input, billing.plan));
}

async function claimInTransaction(
  tx: Prisma.TransactionClient,
  input: ActivationClaimInput,
  plan: Plan,
): Promise<ActivationClaim> {
  const target = await loadClaimRecord(tx, input.shopId, input.bundleId);
  assertTargetClaim(target, input);
  const replacement = await optionalReplacement(tx, input, target);
  await assertClaimCapacity(tx, input.shopId, target, replacement, plan);
  const claimedReplacement = replacement
    ? await claimRow(tx, input.shopId, replacement, BundleStatus.PAUSING, false)
    : undefined;
  const targetStatus = target.activeRevision ? BundleStatus.UPDATING : BundleStatus.PUBLISHING;
  const claimedTarget = await claimRow(tx, input.shopId, target, targetStatus, true);
  const recovery = await createRecoveryJob(tx, input.shopId, claimedTarget, claimedReplacement);
  return {
    target: claimedTarget, replacement: claimedReplacement,
    recoveryJobId: recovery.id, recoveryLeaseToken: recovery.leaseToken,
  };
}

async function loadClaimRecord(
  tx: Prisma.TransactionClient,
  shopId: string,
  bundleId: string,
): Promise<ClaimRecord> {
  const record = await tx.bundle.findFirst({ where: { id: bundleId, shopId }, select: claimSelect });
  if (!record) throw new Error("Bundle not found for this shop.");
  return record;
}

const claimSelect = {
  id: true,
  status: true,
  lockVersion: true,
  countsTowardQuota: true,
  activeRevision: true,
  draftRevision: true,
  editorSaveToken: true,
};

function assertTargetClaim(target: ClaimRecord, input: ActivationClaimInput): void {
  if (target.lockVersion !== input.lockVersion) throw new Error("Bundle changed before publication.");
  if (target.editorSaveToken !== (input.editorSaveToken ?? null)) {
    throw new Error("Another bundle save is in progress.");
  }
  if (BUSY_STATUSES.includes(target.status)) {
    throw new Error("Another bundle operation is in progress.");
  }
  const revision = target.draftRevision ?? target.activeRevision;
  if (revision !== input.revision) throw new Error("A newer bundle revision is available.");
  if (target.countsTowardQuota && input.replacedBundleId) {
    throw new Error("An active bundle cannot replace another bundle.");
  }
}

async function optionalReplacement(
  tx: Prisma.TransactionClient,
  input: ActivationClaimInput,
  target: ClaimRecord,
): Promise<ClaimRecord | undefined> {
  if (!input.replacedBundleId) return undefined;
  const replacement = await loadClaimRecord(tx, input.shopId, input.replacedBundleId);
  if (!replacement.countsTowardQuota || !replacement.activeRevision) {
    throw new Error("Replacement bundle is not active.");
  }
  if (BUSY_STATUSES.includes(replacement.status) || replacement.editorSaveToken) {
    throw new Error("Replacement bundle is busy.");
  }
  if (target.countsTowardQuota) throw new Error("Target bundle is already reserved.");
  return replacement;
}

async function assertClaimCapacity(
  tx: Prisma.TransactionClient,
  shopId: string,
  target: ClaimRecord,
  replacement: ClaimRecord | undefined,
  plan: Plan,
): Promise<void> {
  if (plan === Plan.PRO || target.countsTowardQuota) return;
  const used = await tx.bundle.count({ where: { shopId, countsTowardQuota: true } });
  const resulting = used + 1 - (replacement ? 1 : 0);
  if (resulting > FREE_ACTIVE_BUNDLE_LIMIT) {
    throw new QuotaExceededError(used, FREE_ACTIVE_BUNDLE_LIMIT);
  }
}

async function claimRow(
  tx: Prisma.TransactionClient,
  shopId: string,
  record: ClaimRecord,
  status: BundleStatus,
  reserved: boolean,
): Promise<ClaimedBundleOperation> {
  const updated = await tx.bundle.updateMany({
    where: {
      id: record.id, shopId, lockVersion: record.lockVersion,
      status: record.status, editorSaveToken: record.editorSaveToken,
    },
    data: {
      status, countsTowardQuota: reserved, lockVersion: { increment: 1 },
      ...clearedBundleSaveClaim(),
    },
  });
  if (updated.count !== 1) throw new Error("Concurrent bundle operation detected.");
  return operationRecord(record, status);
}

function operationRecord(
  record: ClaimRecord,
  status: BundleStatus,
): ClaimedBundleOperation {
  const revision = status === BundleStatus.PAUSING
    ? record.activeRevision
    : record.draftRevision ?? record.activeRevision;
  if (!revision) throw new Error("Bundle has no revision to operate on.");
  return {
    id: record.id,
    revision,
    claimVersion: record.lockVersion + 1,
    previousStatus: record.status,
    wasReserved: record.countsTowardQuota,
    hadActiveRevision: Boolean(record.activeRevision),
  };
}

async function createRecoveryJob(
  tx: Prisma.TransactionClient,
  shopId: string,
  target: ClaimedBundleOperation,
  replacement?: ClaimedBundleOperation,
): Promise<{ id: string; leaseToken: string }> {
  const now = new Date();
  const leaseToken = randomUUID();
  const job = await tx.publicationJob.create({
    data: recoveryJobData(shopId, target, replacement, leaseToken, now),
    select: { id: true },
  });
  return { id: job.id, leaseToken };
}

function recoveryJobData(
  shopId: string,
  target: ClaimedBundleOperation,
  replacement: ClaimedBundleOperation | undefined,
  leaseToken: string,
  now: Date,
) {
  return {
    shopId, bundleId: target.id, type: "PUBLISH" as const,
    state: "RUNNING" as const, step: "publishing", leaseToken,
    leaseUntil: new Date(now.getTime() + JOB_LEASE_MS),
    idempotencyKey: `publish:${target.id}:${target.revision}:${target.claimVersion}`,
    nextAttemptAt: new Date(now.getTime() + RECOVERY_DELAY_MS),
    payload: JSON.parse(JSON.stringify({ target, replacement })) as Prisma.InputJsonValue,
  };
}

export function parseActivationRecovery(value: unknown): ActivationRecovery | null {
  if (!isRecord(value)) return null;
  const target = parseOperation(value.target);
  if (!target) return null;
  if (value.replacement === undefined) return { target };
  const replacement = parseOperation(value.replacement);
  if (!replacement) return null;
  return { target, replacement };
}

function parseOperation(value: unknown): ClaimedBundleOperation | null {
  if (!isRecord(value) || !validStatus(value.previousStatus)) return null;
  if (typeof value.id !== "string" || !positiveInteger(value.revision)) return null;
  if (!positiveInteger(value.claimVersion)) return null;
  if (typeof value.wasReserved !== "boolean" || typeof value.hadActiveRevision !== "boolean") return null;
  return {
    id: value.id,
    revision: value.revision,
    claimVersion: value.claimVersion,
    previousStatus: value.previousStatus,
    wasReserved: value.wasReserved,
    hadActiveRevision: value.hadActiveRevision,
  };
}

function validStatus(value: unknown): value is BundleStatus {
  return typeof value === "string" && Object.values(BundleStatus).includes(value as BundleStatus);
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
