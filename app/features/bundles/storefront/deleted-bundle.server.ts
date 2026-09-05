import prisma from "../../../db.server";
import { unauthenticated } from "../../../shopify.server";
import { getBundleForProjection, setBundleStatus } from "../bundle-repository.server";
import { syncBundleMemberships } from "./bundle-membership.server";

export async function draftDeletedParents(domain: string, productId: string): Promise<void> {
  const bundles = await prisma.bundle.findMany({
    where: { shop: { domain }, status: "ACTIVE", parentProductGid: productId },
    select: { id: true, shopId: true },
  });
  if (!bundles.length) return;
  const { admin } = await unauthenticated.admin(domain);
  for (const reference of bundles) {
    const bundle = await getBundleForProjection(reference.shopId, reference.id);
    await syncBundleMemberships(admin, {
      publicId: bundle.publicId, parentVariantId: bundle.parentVariantGid,
      selectors: bundle.selectors, previousSelectors: [], discountPercent: bundle.discountPercent, enabled: false,
    });
    await setBundleStatus(reference.shopId, reference.id, "DRAFT");
  }
}
