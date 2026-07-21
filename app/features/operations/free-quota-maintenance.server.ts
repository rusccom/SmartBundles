import prisma from "../../db.server";
import { refreshBillingState } from "../billing/index.server";
import { pauseBundle } from "../bundles/bundle-pause.server";
import { loadActiveBundle } from "./active-bundle.server";
import { unauthenticated } from "../../shopify.server";

const FREE_LIMIT = 3;
const SHOP_BATCH_SIZE = 20;
const DOWNGRADE_BATCH_SIZE = 5;
const BILLING_BATCH_SIZE = 10;
const BILLING_RETRY_MS = 15 * 60_000;
const STALE_PRO_MS = 6 * 60 * 60_000;
const STALE_FREE_MS = 30 * 60_000;
const FREE_CONFIRMATION_MAX_AGE_MS = 2 * 60 * 60_000;

export interface FreeQuotaSummary {
  paused: number;
  failed: number;
  refreshFailed: number;
}

export async function enforceConfirmedFreeQuota(): Promise<FreeQuotaSummary> {
  const refreshFailed = await refreshDueBilling();
  const shops = await confirmedFreeShops();
  const summary = { paused: 0, failed: 0, refreshFailed };
  for (const shop of shops) {
    const claimed = await touchQuotaScan(shop.id, shop.quotaEnforcedAt);
    if (!claimed) continue;
    if (await hasBusyQuotaOperation(shop.id)) continue;
    const extras = (await rankedBundles(shop.id)).slice(FREE_LIMIT);
    for (const bundle of extras) {
      if (summary.paused + summary.failed >= DOWNGRADE_BATCH_SIZE) return summary;
      await pauseExtra(shop.domain, bundle.id, summary);
    }
  }
  return summary;
}

async function hasBusyQuotaOperation(shopId: string): Promise<boolean> {
  const count = await prisma.bundle.count({
    where: {
      shopId,
      countsTowardQuota: true,
      status: { in: ["PUBLISHING", "UPDATING", "PAUSING"] },
    },
  });
  return count > 0;
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
    const claimed = await claimBillingPoll(record, now);
    if (!claimed) continue;
    try { await refreshBillingState(record.shopId); }
    catch { failed += 1; }
  }
  return failed;
}

function billingPollWhere(now: Date) {
  return {
    shop: { installationStatus: "INSTALLED" as const },
    AND: [
      { OR: [{ billingPolledAt: null }, { billingPolledAt: { lte: new Date(now.getTime() - BILLING_RETRY_MS) } }] },
      { OR: [
        { pendingPlan: "FREE" as const, pendingEffectiveAt: { lte: now } },
        { plan: "PRO" as const, confirmedAt: { lte: new Date(now.getTime() - STALE_PRO_MS) } },
        { plan: "FREE" as const, confirmedAt: { lte: new Date(now.getTime() - STALE_FREE_MS) } },
      ] },
    ],
  };
}

async function claimBillingPoll(
  record: { shopId: string; billingPolledAt: Date | null },
  now: Date,
): Promise<boolean> {
  const claimed = await prisma.shopEntitlement.updateMany({
    where: { shopId: record.shopId, billingPolledAt: record.billingPolledAt },
    data: { billingPolledAt: now },
  });
  return claimed.count === 1;
}

async function confirmedFreeShops() {
  const freshAfter = new Date(Date.now() - FREE_CONFIRMATION_MAX_AGE_MS);
  const entitlements = await prisma.shopEntitlement.findMany({
    where: {
      plan: "FREE",
      confirmedAt: { gte: freshAfter },
      shop: { installationStatus: "INSTALLED" },
    },
    select: { quotaEnforcedAt: true, shop: { select: { id: true, domain: true } } },
    orderBy: { quotaEnforcedAt: { sort: "asc", nulls: "first" } },
    take: SHOP_BATCH_SIZE,
  });
  return entitlements.map(({ shop, quotaEnforcedAt }) => ({ ...shop, quotaEnforcedAt }));
}

async function touchQuotaScan(shopId: string, previous: Date | null): Promise<boolean> {
  const claimed = await prisma.shopEntitlement.updateMany({
    where: { shopId, quotaEnforcedAt: previous },
    data: { quotaEnforcedAt: new Date() },
  });
  return claimed.count === 1;
}

function rankedBundles(shopId: string) {
  return prisma.bundle.findMany({
    where: { shopId, countsTowardQuota: true },
    select: { id: true },
    orderBy: [
      { quotaRank: { sort: "asc", nulls: "last" } },
      { activatedAt: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });
}

async function pauseExtra(
  domain: string,
  bundleId: string,
  summary: FreeQuotaSummary,
): Promise<void> {
  try {
    const active = await loadActiveBundle(bundleId);
    if (!active) return releaseInactive(bundleId, summary);
    const { admin } = await unauthenticated.admin(domain);
    await pauseBundle(admin, active.bundle.shopId, bundleId);
    summary.paused += 1;
  } catch (error) {
    summary.failed += 1;
    await recordDowngradeRetry(bundleId, error);
  }
}

function recordDowngradeRetry(bundleId: string, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 1_000) : "Downgrade pause is retrying.";
  return prisma.bundle.updateMany({
    where: { id: bundleId, status: "PAUSING" },
    data: { health: "NEEDS_ATTENTION", lastErrorCode: "DOWNGRADE_PAUSE_RETRYING", lastErrorMessage: message },
  });
}

async function releaseInactive(bundleId: string, summary: FreeQuotaSummary): Promise<void> {
  const released = await prisma.bundle.updateMany({
    where: { id: bundleId, activeRevision: null, status: { in: ["DRAFT", "PAUSED"] } },
    data: { countsTowardQuota: false },
  });
  if (released.count) summary.paused += 1;
  else summary.failed += 1;
}
