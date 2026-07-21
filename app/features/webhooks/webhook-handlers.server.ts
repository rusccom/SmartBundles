import prisma from "../../db.server";

export async function handleUninstalled(shop: string): Promise<void> {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { shop } }),
    prisma.shop.updateMany({
      where: { domain: shop },
      data: { installationStatus: "UNINSTALLED", uninstalledAt: new Date() },
    }),
  ]);
}

export async function handleScopeUpdate(shop: string, scopes: string[]): Promise<void> {
  await prisma.session.updateMany({ where: { shop }, data: { scope: scopes.join(",") } });
}

export async function handleProductWebhook(
  topic: string,
  payload: unknown,
  webhookId: string,
  shop: string,
): Promise<void> {
  const productGid = productId(payload);
  if (!productGid) return;
  const bundles = await relatedBundles(shop, productGid);
  await queueReconciliation(bundles, webhookId, productGid);
}

function productId(payload: unknown): string | undefined {
  if (!isRecord(payload) || !(typeof payload.id === "number" || typeof payload.id === "string")) return undefined;
  if (typeof payload.id === "string" && payload.id.startsWith("gid://shopify/Product/")) return payload.id;
  return `gid://shopify/Product/${payload.id}`;
}

async function relatedBundles(shop: string, productGid: string) {
  const bundles = await prisma.bundle.findMany({
    where: {
      shop: { domain: shop },
      activeRevision: { not: null },
      OR: [
        { parentProductGid: productGid },
        { revisions: { some: { selectors: { some: { productGid } } } } },
      ],
    },
    select: {
      id: true, shopId: true, parentProductGid: true, activeRevision: true,
      revisions: { where: { selectors: { some: { productGid } } }, select: { revision: true } },
    },
  });
  return bundles.filter((bundle) => activeBundleUsesProduct(bundle, productGid));
}

function activeBundleUsesProduct(
  bundle: { parentProductGid: string | null; activeRevision: number | null; revisions: Array<{ revision: number }> },
  productGid: string,
): boolean {
  if (bundle.parentProductGid === productGid) return true;
  return bundle.revisions.some(({ revision }) => revision === bundle.activeRevision);
}

async function queueReconciliation(
  bundles: Array<{ id: string; shopId: string }>,
  webhookId: string,
  productGid: string,
): Promise<void> {
  if (!bundles.length) return;
  await prisma.publicationJob.createMany({
    data: bundles.map(({ id, shopId }) => ({
      shopId, bundleId: id, type: "RECONCILE", idempotencyKey: `${webhookId}:${id}`, payload: { productGid },
    })),
    skipDuplicates: true,
  });
}

export async function handlePrivacy(topic: string, shop: string): Promise<void> {
  if (!topic.includes("SHOP_REDACT")) return;
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { shop } }),
    prisma.webhookDelivery.deleteMany({ where: { shopDomain: shop } }),
    prisma.shop.deleteMany({ where: { domain: shop } }),
  ]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
