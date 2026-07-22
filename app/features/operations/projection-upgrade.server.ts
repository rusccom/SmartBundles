import prisma from "../../db.server";

export const PRICING_MINIMUM_JOB_PREFIX = "pricing-min-v1:";

export async function queueProjectionUpgrades(): Promise<number> {
  const bundles = await upgradeCandidates();
  if (!bundles.length) return 0;
  const queued = await prisma.publicationJob.createMany({
    data: bundles.map(pricingMinimumJob),
    skipDuplicates: true,
  });
  return queued.count;
}

function upgradeCandidates() {
  return prisma.bundle.findMany({
    where: {
      status: "ACTIVE", editorSaveToken: null,
      activeRevision: { not: null }, countsTowardQuota: true, runtimeEnabled: true,
    },
    select: {
      id: true,
      shopId: true,
    },
  });
}

type UpgradeCandidate = Awaited<ReturnType<typeof upgradeCandidates>>[number];

function pricingMinimumJob(bundle: UpgradeCandidate) {
  return {
    shopId: bundle.shopId,
    bundleId: bundle.id,
    type: "RECONCILE" as const,
    idempotencyKey: `${PRICING_MINIMUM_JOB_PREFIX}${bundle.id}`,
    payload: { reason: "pricing-min-v1" },
  };
}
