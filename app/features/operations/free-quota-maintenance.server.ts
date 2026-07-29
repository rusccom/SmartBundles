import prisma from "../../db.server";
import { unauthenticated } from "../../shopify.server";
import { refreshBillingState } from "../billing/index.server";
import { draftBundle } from "../bundles/bundle-projection.server";
import { FREE_ACTIVE_BUNDLE_LIMIT } from "../bundles/bundle-quota.server";

const SHOP_BATCH_SIZE = 20;
const DRAFT_BATCH_SIZE = 5;
const BILLING_BATCH_SIZE = 10;
const BILLING_RETRY_MS = 15 * 60_000;
const STALE_PRO_MS = 6 * 60 * 60_000;
const STALE_FREE_MS = 30 * 60_000;
const FREE_CONFIRMATION_MAX_AGE_MS = 2 * 60 * 60_000;

export interface FreeQuotaSummary {
  drafted: number;
  failed: number;
  refreshFailed: number;
}

export async function enforceConfirmedFreeQuota(): Promise<FreeQuotaSummary> {
  const refreshFailed = await refreshDueBilling();
  const shops = await confirmedFreeShops();
  const summary = { drafted: 0, failed: 0, refreshFailed };
  for (const shop of shops) {
    if (quotaBatchFull(summary)) break;
    if (!(await touchQuotaScan(shop.id, shop.quotaEnforcedAt))) continue;
    await draftShopExtras(shop, summary);
  }
  return summary;
}

async function draftShopExtras(
  shop: ConfirmedFreeShop,
  summary: FreeQuotaSummary,
): Promise<void> {
  const extras = (await activeBundles(shop.id)).slice(FREE_ACTIVE_BUNDLE_LIMIT);
  if (!extras.length) return;
  const admin = await bundleAdmin(shop.domain);
  if (!admin) return recordShopFailures(extras.length, summary);
  for (const bundle of extras) {
    if (quotaBatchFull(summary)) return;
    await draftExtra(admin, shop.id, bundle.id, summary);
  }
}

async function bundleAdmin(domain: string): Promise<AdminClient | null> {
  try {
    return (await unauthenticated.admin(domain)).admin;
  } catch {
    return null;
  }
}

function recordShopFailures(count: number, summary: FreeQuotaSummary): void {
  const remaining = DRAFT_BATCH_SIZE - summary.drafted - summary.failed;
  summary.failed += Math.min(count, remaining);
}

async function draftExtra(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
  summary: FreeQuotaSummary,
): Promise<void> {
  try {
    await draftBundle(admin, shopId, bundleId);
    summary.drafted += 1;
  } catch {
    summary.failed += 1;
  }
}

function quotaBatchFull(summary: FreeQuotaSummary): boolean {
  return summary.drafted + summary.failed >= DRAFT_BATCH_SIZE;
}

async function refreshDueBilling(): Promise<number> {
  const now = new Date();
  const due = await prisma.shopEntitlement.findMany({
    where: billingPollWhere(now),
    select: { shopId: true, billingPolledAt: true },
    orderBy: { billingPolledAt: { sort: "asc", nulls: "first" } },
    take: BILLING_BATCH_SIZE,
  });
  let failed = 0;
  for (const record of due) {
    if (!(await claimBillingPoll(record, now))) continue;
    try {
      await refreshBillingState(record.shopId);
    } catch {
      failed += 1;
    }
  }
  return failed;
}

function billingPollWhere(now: Date) {
  return {
    shop: { installationStatus: "INSTALLED" as const },
    AND: [
      {
        OR: [
          { billingPolledAt: null },
          { billingPolledAt: { lte: before(now, BILLING_RETRY_MS) } },
        ],
      },
      {
        OR: [
          { pendingPlan: "FREE" as const, pendingEffectiveAt: { lte: now } },
          { plan: "PRO" as const, confirmedAt: { lte: before(now, STALE_PRO_MS) } },
          { plan: "FREE" as const, confirmedAt: { lte: before(now, STALE_FREE_MS) } },
        ],
      },
    ],
  };
}

function before(now: Date, duration: number): Date {
  return new Date(now.getTime() - duration);
}

async function claimBillingPoll(
  record: BillingPoll,
  now: Date,
): Promise<boolean> {
  const claimed = await prisma.shopEntitlement.updateMany({
    where: { shopId: record.shopId, billingPolledAt: record.billingPolledAt },
    data: { billingPolledAt: now },
  });
  return claimed.count === 1;
}

async function confirmedFreeShops(): Promise<ConfirmedFreeShop[]> {
  const entitlements = await prisma.shopEntitlement.findMany({
    where: {
      plan: "FREE",
      confirmedAt: { gte: before(new Date(), FREE_CONFIRMATION_MAX_AGE_MS) },
      shop: { installationStatus: "INSTALLED" },
    },
    select: {
      quotaEnforcedAt: true,
      shop: { select: { id: true, domain: true } },
    },
    orderBy: { quotaEnforcedAt: { sort: "asc", nulls: "first" } },
    take: SHOP_BATCH_SIZE,
  });
  return entitlements.map(({ shop, quotaEnforcedAt }) => ({ ...shop, quotaEnforcedAt }));
}

async function touchQuotaScan(shopId: string, previous: Date | null): Promise<boolean> {
  const claimed = await prisma.shopEntitlement.updateMany({
    where: { shopId, plan: "FREE", quotaEnforcedAt: previous },
    data: { quotaEnforcedAt: new Date() },
  });
  return claimed.count === 1;
}

function activeBundles(shopId: string) {
  return prisma.bundle.findMany({
    where: { shopId, status: "ACTIVE" },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

type AdminClient = Awaited<ReturnType<typeof unauthenticated.admin>>["admin"];
type BillingPoll = { shopId: string; billingPolledAt: Date | null };
type ConfirmedFreeShop = {
  id: string;
  domain: string;
  quotaEnforcedAt: Date | null;
};
