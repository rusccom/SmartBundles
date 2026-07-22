import prisma from "../../db.server";
import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest, assertNoUserErrors } from "../shopify/admin-api.server";

const SHOP_QUERY = `#graphql
  query SmartBundleShopContext {
    shop {
      id
      myshopifyDomain
      currencyCode
      features {
        bundles { eligibleForBundles ineligibilityReason sellsBundles }
      }
    }
    publications(first: 20) { nodes { id name } }
    cartTransforms(first: 10) { nodes { id } }
  }
`;

const CREATE_TRANSFORM = `#graphql
  mutation SmartBundleCreateTransform($handle: String!) {
    cartTransformCreate(functionHandle: $handle, blockOnFailure: true) {
      cartTransform { id }
      userErrors { message }
    }
  }
`;

interface ShopQuery {
  shop: {
    id: string;
    myshopifyDomain: string;
    currencyCode: string;
    features: { bundles: { eligibleForBundles: boolean; ineligibilityReason?: string | null } };
  };
  publications: { nodes: Array<{ id: string; name: string }> };
  cartTransforms: { nodes: Array<{ id: string }> };
}

interface TransformMutation {
  cartTransformCreate: {
    cartTransform?: { id: string } | null;
    userErrors: Array<{ message: string }>;
  };
}

export async function ensureShopContext(admin: AdminClient, domain: string) {
  const cached = await freshContext(domain);
  if (cached) return cached;
  const context = await adminRequest<ShopQuery>(admin, SHOP_QUERY);
  const transform = await ensureTransform(admin, context);
  return persistContext(context, transform);
}

async function freshContext(domain: string) {
  const threshold = new Date(Date.now() - 5 * 60_000);
  return prisma.shop.findFirst({
    where: {
      domain,
      currencyCode: { not: null },
      installationStatus: "INSTALLED",
      updatedAt: { gt: threshold },
      cartTransformGid: { not: null },
    },
    include: { entitlement: true },
  });
}

async function ensureTransform(admin: AdminClient, context: ShopQuery): Promise<string | null> {
  if (context.cartTransforms.nodes[0]?.id) return context.cartTransforms.nodes[0].id;
  if (!context.shop.features.bundles.eligibleForBundles) return null;
  try {
    return await createTransform(admin);
  } catch {
    return null;
  }
}

async function createTransform(admin: AdminClient): Promise<string | null> {
  const handle = process.env.SHOPIFY_BUNDLE_FUNCTION_HANDLE || "smart-bundle-transform";
  const result = await adminRequest<TransformMutation>(admin, CREATE_TRANSFORM, { handle });
  assertNoUserErrors(result.cartTransformCreate.userErrors, "Cart Transform setup failed");
  return result.cartTransformCreate.cartTransform?.id ?? null;
}

async function persistContext(context: ShopQuery, transform: string | null) {
  const { shop } = context;
  const publication = context.publications.nodes.find(({ name }) => name === "Online Store");
  const saved = await prisma.shop.upsert({
    where: { domain: shop.myshopifyDomain },
    update: updateData(context, transform, publication?.id),
    create: createData(context, transform, publication?.id),
  });
  const entitlement = await ensureEntitlement(saved.id);
  return { ...saved, entitlement };
}

function updateData(context: ShopQuery, transform: string | null, publication?: string) {
  const bundles = context.shop.features.bundles;
  return {
    shopGid: context.shop.id,
    currencyCode: context.shop.currencyCode,
    installationStatus: "INSTALLED" as const,
    eligibleForBundles: bundles.eligibleForBundles,
    ineligibilityReason: bundles.ineligibilityReason,
    onlineStorePublicationGid: publication,
    cartTransformGid: transform,
    uninstalledAt: null,
  };
}

function createData(context: ShopQuery, transform: string | null, publication?: string) {
  return { domain: context.shop.myshopifyDomain, ...updateData(context, transform, publication) };
}

async function ensureEntitlement(shopId: string) {
  await prisma.shopEntitlement.createMany({
    data: [{ shopId, plan: "FREE" }],
    skipDuplicates: true,
  });
  return prisma.shopEntitlement.findUniqueOrThrow({ where: { shopId } });
}
