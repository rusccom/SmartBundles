import prisma from "../../db.server";
import { syncBundlePresentation } from "../bundles/bundle-projection.server";
import type { AdminClient } from "../shopify/admin-api.server";

export interface StorefrontTextSyncSummary {
  synced: number;
  failed: number;
}

export async function syncActiveBundleTexts(
  admin: AdminClient,
  shopId: string,
): Promise<StorefrontTextSyncSummary> {
  const bundles = await prisma.bundle.findMany({
    where: { shopId, status: "ACTIVE" },
    select: { id: true },
  });
  const results = await Promise.allSettled(
    bundles.map((bundle) => syncBundlePresentation(admin, shopId, bundle.id)),
  );
  const synced = results.filter(({ status }) => status === "fulfilled").length;
  return { synced, failed: results.length - synced };
}
