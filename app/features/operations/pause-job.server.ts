import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import type { ReplacementRestoreClaim } from "./replacement-quota-restore.server";

const RECOVERY_DELAY_MS = 5 * 60_000;

export interface PauseJobInput {
  shopId: string;
  bundleId: string;
  revision: number;
  lockVersion: number;
  restore?: ReplacementRestoreClaim;
}

export async function enqueueBundlePause(input: PauseJobInput): Promise<void> {
  await prisma.publicationJob.createMany({
    data: [pauseJobData(input)],
    skipDuplicates: true,
  });
}

export async function createPauseRecoveryJob(
  tx: Prisma.TransactionClient,
  input: PauseJobInput,
): Promise<string> {
  const job = await tx.publicationJob.create({
    data: {
      ...pauseJobData(input),
      nextAttemptAt: new Date(Date.now() + RECOVERY_DELAY_MS),
    },
    select: { id: true },
  });
  return job.id;
}

export function completePauseRecoveryJob(jobId: string) {
  return prisma.publicationJob.updateMany({
    where: { id: jobId, state: "PENDING" },
    data: { state: "COMPLETED", step: "paused", lastError: null },
  });
}

function pauseJobData(input: PauseJobInput) {
  return {
    shopId: input.shopId,
    bundleId: input.bundleId,
    type: "PAUSE" as const,
    idempotencyKey: pauseKey(input),
    payload: jsonPayload(pausePayload(input)),
  };
}

function jsonPayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function pausePayload(input: PauseJobInput) {
  const payload = { revision: input.revision, lockVersion: input.lockVersion };
  return input.restore ? { ...payload, restore: input.restore } : payload;
}

function pauseKey(input: PauseJobInput): string {
  const restore = input.restore
    ? `${input.restore.bundleId}:${input.restore.claimVersion}`
    : "none";
  return `pause:${input.bundleId}:${input.revision}:${input.lockVersion}:${restore}`;
}
