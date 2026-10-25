import prisma from "../../db.server";
import { syncBundlePresentation } from "../bundles/bundle-projection.server";
import type { AdminClient } from "../shopify/admin-api.server";
import { errorManager } from "../errors/error-manager.server";

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
  await Promise.all(results.map((result, index) => result.status === "rejected"
    ? errorManager.report(result.reason, { code: "STOREFRONT_TEXT_SYNC_FAILED", source: "settings", shopId,
      context: { bundleId: bundles[index].id } }) : Promise.resolve(null)));
  return { synced, failed: results.length - synced };
}
