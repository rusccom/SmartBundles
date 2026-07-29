import prisma from "../../db.server";
import { unauthenticated } from "../../shopify.server";
import {
  draftBundle,
  syncActiveBundle,
} from "../bundles/bundle-projection.server";

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
  _webhookId: string,
  shop: string,
): Promise<void> {
  const productGid = productId(payload);
  if (!productGid) return;
  const deleted = topic.includes("DELETE");
  if (deleted) await draftDeletedParents(shop, productGid);
  const bundles = await relatedBundles(shop, productGid);
  if (!bundles.length) return;
  const { admin } = await unauthenticated.admin(shop);
  const operation = deleted ? draftBundle : syncActiveBundle;
  await Promise.all(bundles.map(({ id, shopId }) => operation(admin, shopId, id)));
}

function draftDeletedParents(shop: string, productGid: string) {
  return prisma.bundle.updateMany({
    where: {
      shop: { domain: shop }, status: "ACTIVE", parentProductGid: productGid,
    },
    data: { status: "DRAFT" },
  });
}

function productId(payload: unknown): string | undefined {
  if (!isRecord(payload) || !(typeof payload.id === "number" || typeof payload.id === "string")) return undefined;
  if (typeof payload.id === "string" && payload.id.startsWith("gid://shopify/Product/")) return payload.id;
  return `gid://shopify/Product/${payload.id}`;
}

async function relatedBundles(shop: string, productGid: string) {
  return prisma.bundle.findMany({
    where: {
      shop: { domain: shop },
      status: "ACTIVE",
      parentProductGid: { not: productGid },
      selectors: { some: { productGid } },
    },
    select: { id: true, shopId: true },
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
