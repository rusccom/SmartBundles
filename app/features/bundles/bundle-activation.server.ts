import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import type { AdminClient } from "../shopify/admin-api.server";
import {
  claimActivation,
  parseActivationRecovery,
} from "./activation-claim.server";
import type {
  ActivationRecovery,
  ClaimedBundleOperation,
} from "./activation-claim.server";
import {
  pauseClaimedBundle,
} from "./bundle-pause.server";
import type { BundlePauseClaim } from "./bundle-pause.server";
import { recoverBundleSaveClaim } from "./bundle-save-recovery.server";
import {
  assertPublicationReady,
  preparePublication,
  publishPrepared,
} from "./bundle-publication.server";
import type { PreparedPublication } from "./bundle-publication.server";
import { serializable } from "./bundle-quota.server";
import { markPublished } from "./publication-repository.server";
import {
  restoreReplacementQuota,
} from "../operations/replacement-quota-restore.server";
import type {
  ReplacementRestoreClaim,
} from "../operations/replacement-quota-restore.server";
import { runWithPublicationJobOwnership } from "../operations/sync-publication-job-owner.server";
import { isBundleProjectionError } from "./bundle-projection-error.server";
import { assertBundleWritesEnabled } from "../operations/bundle-write-gate.server";

const MAX_PUBLISH_ATTEMPTS = 5;

export interface PublishRecoveryJob {
  shopId: string;
  bundleId: string;
  payload: unknown;
  attempts: number;
}

export async function activateBundle(
  admin: AdminClient, shopId: string, bundleId: string, replacedBundleId?: string, editorSaveToken?: string,
): Promise<void> {
  assertBundleWritesEnabled();
  await recoverActivationSaves(admin, shopId,
    editorSaveToken ? [replacedBundleId] : [bundleId, replacedBundleId]);
  const prepared = await preparePublication(admin, bundleId, shopId);
  assertPublicationReady(prepared);
  const claim = await claimActivation({
    shopId, bundleId, replacedBundleId, editorSaveToken,
    revision: prepared.revision.revision, lockVersion: prepared.bundle.lockVersion,
  });
  try {
    await executeClaimedActivation(admin, shopId, claim, prepared);
  } catch (error) {
    await recordClaimError(claim.target, error);
    if (isBundleProjectionError(error)) await compensateActivation(admin, shopId, claim);
    throw error;
  }
}

async function recoverActivationSaves(
  admin: AdminClient,
  shopId: string,
  bundleIds: Array<string | undefined>,
): Promise<void> {
  const ids = [...new Set(bundleIds.filter((id): id is string => Boolean(id)))];
  const recoveries = await Promise.all(ids.map((id) => recoverBundleSaveClaim(admin, shopId, id)));
  if (recoveries.includes("WAITING")) throw new Error("Bundle editor save recovery is waiting.");
}

function executeClaimedActivation(
  admin: AdminClient,
  shopId: string,
  claim: Awaited<ReturnType<typeof claimActivation>>,
  prepared: PreparedPublication,
): Promise<void> {
  return runWithPublicationJobOwnership(
    claim.recoveryJobId, claim.recoveryLeaseToken, admin,
    (ownedAdmin, assertOwned) => executeActivation(ownedAdmin, shopId, claim, prepared, assertOwned),
  );
}

export async function resumeActivationJob(
  admin: AdminClient,
  job: PublishRecoveryJob,
): Promise<"PUBLISHED" | "COMPENSATED" | "SKIPPED"> {
  const recovery = parseActivationRecovery(job.payload);
  if (!recovery || recovery.target.id !== job.bundleId) return "SKIPPED";
  try {
    await executeActivation(admin, job.shopId, recovery);
    return "PUBLISHED";
  } catch (error) {
    await recordClaimError(recovery.target, error);
    if (isBundleProjectionError(error)) {
      await compensateActivation(admin, job.shopId, recovery);
      return "COMPENSATED";
    }
    if (job.attempts < MAX_PUBLISH_ATTEMPTS) throw error;
    await compensateActivation(admin, job.shopId, recovery);
    return "COMPENSATED";
  }
}

async function executeActivation(
  admin: AdminClient,
  shopId: string,
  recovery: ActivationRecovery,
  prepared?: PreparedPublication,
  assertOwned?: () => Promise<void>,
): Promise<void> {
  if (await activationCommitted(shopId, recovery.target)) {
    return finishReplacement(admin, shopId, recovery.replacement);
  }
  await assertCurrentClaim(shopId, recovery.target);
  const publication = prepared ?? await preparePublication(
    admin, recovery.target.id, shopId, recovery.target.revision,
  );
  assertPublicationReady(publication);
  const result = await publishPrepared(admin, publication, recovery.target.claimVersion);
  await assertOwned?.();
  await commitActivation(shopId, recovery.target, result);
  await finishReplacement(admin, shopId, recovery.replacement);
}

async function commitActivation(
  shopId: string,
  target: ClaimedBundleOperation,
  result: { runtimeDigest: string; presentationDigest: string },
): Promise<void> {
  try {
    await markPublished({
      bundleId: target.id,
      revision: target.revision,
      claimVersion: target.claimVersion,
      ...result,
    });
  } catch (error) {
    if (!await activationCommitted(shopId, target)) throw error;
  }
}

async function finishReplacement(
  admin: AdminClient,
  shopId: string,
  replacement?: ClaimedBundleOperation,
): Promise<void> {
  if (!replacement) return;
  const state = await replacementState(replacement.id);
  if (pauseCompleted(state, replacement)) return;
  if (!pauseReady(state, replacement)) throw new Error("Replacement pause claim is stale.");
  await pauseClaimedBundle(admin, pauseClaim(shopId, replacement));
}

function replacementState(bundleId: string) {
  return prisma.bundle.findUniqueOrThrow({
    where: { id: bundleId },
    select: { status: true, lockVersion: true, runtimeEnabled: true, publishedVerified: true },
  });
}

type ReplacementState = Awaited<ReturnType<typeof replacementState>>;

function pauseCompleted(state: ReplacementState, claim: ClaimedBundleOperation): boolean {
  return state.status === "PAUSED" && state.lockVersion === claim.claimVersion + 1 &&
    !state.runtimeEnabled && !state.publishedVerified;
}

function pauseReady(state: ReplacementState, claim: ClaimedBundleOperation): boolean {
  return state.status === "PAUSING" && state.lockVersion === claim.claimVersion;
}

function pauseClaim(shopId: string, operation: ClaimedBundleOperation): BundlePauseClaim {
  return {
    shopId,
    bundleId: operation.id,
    revision: operation.revision,
    claimVersion: operation.claimVersion,
  };
}

async function compensateActivation(
  admin: AdminClient,
  shopId: string,
  recovery: ActivationRecovery,
): Promise<void> {
  if (await activationCommitted(shopId, recovery.target)) {
    return finishReplacement(admin, shopId, recovery.replacement);
  }
  const claim = await claimFailedTargetPause(shopId, recovery.target);
  const restore = recovery.replacement ? restoreClaim(recovery.replacement) : undefined;
  if (!claim) return restoreAfterPause(shopId, recovery.target.id, restore);
  const result = await pauseClaimedBundle(admin, claim, restore);
  if (result === "PAUSED") await restoreAfterPause(shopId, recovery.target.id, restore);
}

function restoreClaim(operation: ClaimedBundleOperation): ReplacementRestoreClaim {
  return {
    bundleId: operation.id,
    claimVersion: operation.claimVersion,
    previousStatus: operation.previousStatus,
  };
}

function restoreAfterPause(
  shopId: string,
  targetId: string,
  restore?: ReplacementRestoreClaim,
): Promise<void> {
  return restore
    ? restoreReplacementQuota(shopId, targetId, restore)
    : Promise.resolve();
}

async function claimFailedTargetPause(
  shopId: string,
  target: ClaimedBundleOperation,
): Promise<BundlePauseClaim | null> {
  return serializable(async (tx) => {
    const current = await tx.bundle.findFirstOrThrow({
      where: { id: target.id, shopId },
      select: { status: true, lockVersion: true, runtimeEnabled: true, publishedVerified: true },
    });
    if (pauseCompleted(current, target)) return null;
    if (current.lockVersion !== target.claimVersion) throw new Error("Failed publication claim is stale.");
    if (!(["PUBLISHING", "UPDATING", "PAUSING"] as string[]).includes(current.status)) {
      throw new Error("Failed publication is no longer compensatable.");
    }
    if (current.status !== "PAUSING") await markPausing(tx, target.id);
    return pauseClaim(shopId, target);
  });
}

function markPausing(tx: Prisma.TransactionClient, bundleId: string) {
  return tx.bundle.update({
    where: { id: bundleId }, data: { status: "PAUSING" }, select: { id: true },
  });
}

function activationCommitted(
  shopId: string,
  target: ClaimedBundleOperation,
): Promise<boolean> {
  return prisma.bundle.count({
    where: {
      id: target.id,
      shopId,
      activeRevision: target.revision,
      status: "ACTIVE",
      lockVersion: target.claimVersion + 1,
      runtimeEnabled: true,
      publishedVerified: true,
    },
  }).then(Boolean);
}

async function assertCurrentClaim(
  shopId: string,
  target: ClaimedBundleOperation,
): Promise<void> {
  const current = await prisma.bundle.count({
    where: {
      id: target.id,
      shopId,
      lockVersion: target.claimVersion,
      status: { in: ["PUBLISHING", "UPDATING"] },
    },
  });
  if (!current) throw new Error("Bundle publication claim is stale.");
}

function recordClaimError(target: ClaimedBundleOperation, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown publication error";
  return prisma.bundle.updateMany({
    where: {
      id: target.id,
      lockVersion: target.claimVersion,
      status: { in: ["PUBLISHING", "UPDATING", "PAUSING"] },
    },
    data: { lastErrorCode: "SHOPIFY_SYNC_RETRY", lastErrorMessage: message },
  });
}
