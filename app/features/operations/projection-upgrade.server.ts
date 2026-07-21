import prisma from "../../db.server";

const TARGET_SCHEMA_VERSION = 2;

export async function queueProjectionUpgrades(): Promise<number> {
  if (process.env.SMART_BUNDLE_ENABLE_V2_REPUBLISH !== "true") return 0;
  const bundles = await upgradeCandidates();
  const stale = bundles.filter(needsUpgrade);
  if (!stale.length) return 0;
  const queued = await prisma.publicationJob.createMany({
    data: stale.map(upgradeJob),
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
      activeRevision: true,
      revisions: { where: { status: "PUBLISHED" }, select: { revision: true, runtimeConfig: true } },
    },
  });
}

type UpgradeCandidate = Awaited<ReturnType<typeof upgradeCandidates>>[number];

function needsUpgrade(bundle: UpgradeCandidate): boolean {
  const revision = bundle.revisions.find((item) => item.revision === bundle.activeRevision);
  return schemaVersion(revision?.runtimeConfig) !== TARGET_SCHEMA_VERSION;
}

function schemaVersion(value: unknown): number | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const version = (value as Record<string, unknown>).sv;
  return Number.isSafeInteger(version) ? Number(version) : null;
}

function upgradeJob(bundle: UpgradeCandidate) {
  return {
    shopId: bundle.shopId,
    bundleId: bundle.id,
    type: "RECONCILE" as const,
    idempotencyKey: `projection-v${TARGET_SCHEMA_VERSION}:${bundle.id}:${bundle.activeRevision}`,
    payload: { reason: `projection-v${TARGET_SCHEMA_VERSION}` },
  };
}
