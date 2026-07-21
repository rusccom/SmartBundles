import type { BundleStatus, Prisma } from "@prisma/client";
import { serializable } from "../bundles/bundle-quota.server";

export interface ReplacementRestoreClaim {
  bundleId: string;
  claimVersion: number;
  previousStatus: BundleStatus;
}

export async function restoreReplacementQuota(
  shopId: string,
  targetId: string,
  claim: ReplacementRestoreClaim,
): Promise<void> {
  if (targetId === claim.bundleId) throw new Error("Quota compensation target is invalid.");
  await serializable((tx) => restoreTransaction(tx, shopId, targetId, claim));
}

async function restoreTransaction(
  tx: Prisma.TransactionClient,
  shopId: string,
  targetId: string,
  claim: ReplacementRestoreClaim,
): Promise<void> {
  await assertTargetDisabled(tx, shopId, targetId);
  if (await alreadyRestored(tx, shopId, claim)) return;
  await restoreClaimedBundle(tx, shopId, claim);
}

async function restoreClaimedBundle(
  tx: Prisma.TransactionClient,
  shopId: string,
  claim: ReplacementRestoreClaim,
): Promise<void> {
  const restored = await tx.bundle.updateMany({
    where: {
      id: claim.bundleId, shopId, status: "PAUSING",
      lockVersion: claim.claimVersion, countsTowardQuota: false,
    },
    data: {
      status: claim.previousStatus,
      countsTowardQuota: true,
      lockVersion: { increment: 1 },
    },
  });
  if (restored.count !== 1) throw new Error("Replacement quota restore claim is stale.");
}

async function assertTargetDisabled(
  tx: Prisma.TransactionClient,
  shopId: string,
  targetId: string,
): Promise<void> {
  const target = await tx.bundle.findFirst({
    where: { id: targetId, shopId }, select: disabledSelect,
  });
  if (!target || target.countsTowardQuota || target.runtimeEnabled || target.publishedVerified) {
    throw new Error("Failed publication is not safely disabled.");
  }
}

const disabledSelect = {
  countsTowardQuota: true,
  runtimeEnabled: true,
  publishedVerified: true,
};

function alreadyRestored(
  tx: Prisma.TransactionClient,
  shopId: string,
  claim: ReplacementRestoreClaim,
): Promise<boolean> {
  return tx.bundle.count({
    where: {
      id: claim.bundleId, shopId, status: claim.previousStatus,
      lockVersion: claim.claimVersion + 1, countsTowardQuota: true,
    },
  }).then(Boolean);
}
