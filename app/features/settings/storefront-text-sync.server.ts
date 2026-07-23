import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";

export const STOREFRONT_TEXT_SYNC_REASON = "shop-storefront-texts";

export async function queueShopStorefrontTextSync(
  tx: Prisma.TransactionClient,
  shopId: string,
  textVersion: number,
): Promise<number> {
  const bundles = await syncTargets(tx, shopId);
  if (!bundles.length) return 0;
  const queued = await tx.publicationJob.createMany({
    data: bundles.map((bundle) => storefrontTextSyncJob(shopId, textVersion, bundle)),
    skipDuplicates: true,
  });
  return queued.count;
}

function syncTargets(tx: Prisma.TransactionClient, shopId: string) {
  return tx.bundle.findMany({
    where: {
      shopId,
      status: { not: "ARCHIVED" },
      activeRevision: { not: null },
      countsTowardQuota: true,
    },
    select: { id: true, lockVersion: true },
  });
}

type SyncTarget = Awaited<ReturnType<typeof syncTargets>>[number];

export function storefrontTextSyncJob(
  shopId: string,
  textVersion: number,
  bundle: SyncTarget,
) {
  return {
    shopId,
    bundleId: bundle.id,
    type: "RECONCILE" as const,
    idempotencyKey: `shop-storefront-texts:${textVersion}:${bundle.id}:${bundle.lockVersion}`,
    payload: {
      reason: STOREFRONT_TEXT_SYNC_REASON,
      storefrontTextVersion: textVersion,
      observedBundleLockVersion: bundle.lockVersion,
    },
  };
}

export async function queueStorefrontTextDriftSyncs(): Promise<number> {
  const bundles = await driftTargets();
  if (!bundles.length) return 0;
  const jobs = bundles.map((bundle) => storefrontTextSyncJob(
    bundle.shopId,
    bundle.shop.storefrontTextVersion,
    bundle,
  ));
  const queued = await prisma.publicationJob.createMany({ data: jobs, skipDuplicates: true });
  return queued.count;
}

function driftTargets() {
  return prisma.bundle.findMany({
    where: {
      status: "ACTIVE",
      activeRevision: { not: null },
      countsTowardQuota: true,
      runtimeEnabled: true,
      editorSaveToken: null,
    },
    select: {
      id: true,
      shopId: true,
      lockVersion: true,
      shop: { select: { storefrontTextVersion: true } },
      projection: { select: { storefrontTextVersion: true } },
    },
  }).then((bundles) => bundles.filter((bundle) =>
    bundle.projection?.storefrontTextVersion !== bundle.shop.storefrontTextVersion));
}

export function isStorefrontTextSyncPayload(value: unknown): boolean {
  return isRecord(value) && value.reason === STOREFRONT_TEXT_SYNC_REASON;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
