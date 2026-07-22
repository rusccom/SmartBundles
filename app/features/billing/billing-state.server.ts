import { Plan, SubscriptionStatus, type ShopEntitlement } from "@prisma/client";
import prisma from "../../db.server";
import { getProPlanHandle } from "./billing-config.server";
import { complimentaryBillingState } from "./complimentary-entitlement.server";
import type {
  BillingRefreshMode,
  BillingSource,
  BillingState,
  PartnerActiveSubscription,
} from "./billing.types";
import { fetchActiveSubscription } from "./partner-api.server";
import { PartnerApiError } from "./partner-api-error";

const NORMAL_CACHE_MS = 5 * 60_000;
const QUOTA_CACHE_MS = 60_000;
const PRO_GRACE_MS = 24 * 60 * 60_000;

interface EntitlementValues {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  planHandle: string | null;
  partnerSubscriptionId: string | null;
  confirmedAt: Date;
  graceUntil: Date | null;
  pendingPlan: Plan | null;
  pendingEffectiveAt: Date | null;
}

export async function getBillingState(
  shopId: string,
  mode: BillingRefreshMode = "normal",
): Promise<BillingState> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { entitlement: true },
  });
  if (!shop) throw new Error("Shop not found.");
  const now = new Date();
  const complimentary = await complimentaryBillingState(
    shop.id, shop.domain, shop.entitlement, mode, now,
  );
  if (complimentary) return complimentary;
  if (isFresh(shop.entitlement, mode, now))
    return stateFromRecord(shop.entitlement!, "cache");
  if (!shop.shopGid)
    throw new Error("Shopify shop ID is required for billing verification.");
  return verifyBilling(shopId, shop.shopGid, shop.entitlement, now);
}

export function refreshBillingState(shopId: string): Promise<BillingState> {
  return getBillingState(shopId, "force");
}

async function verifyBilling(
  shopId: string,
  shopGid: string,
  previous: ShopEntitlement | null,
  now: Date,
): Promise<BillingState> {
  try {
    const subscription = await fetchActiveSubscription(shopGid);
    const values = verifiedValues(subscription, now);
    const saved = await saveEntitlement(shopId, values);
    return stateFromRecord(saved, "partner");
  } catch (error) {
    const grace = graceState(previous, error, now);
    if (grace) return grace;
    const restricted = await restrictExpiredPro(shopId, previous, error, now);
    if (restricted) return restricted;
    throw error;
  }
}

async function restrictExpiredPro(
  shopId: string, previous: ShopEntitlement | null, error: unknown, now: Date,
): Promise<BillingState | null> {
  if (!restrictionCandidate(previous, error, now)) return null;
  const result = await prisma.shopEntitlement.updateMany({
    where: {
      shopId, version: previous.version, plan: Plan.PRO,
      graceUntil: { lte: now },
    },
    data: restrictionData(now),
  });
  const current = await prisma.shopEntitlement.findUnique({ where: { shopId } });
  if (!current) return null;
  return stateFromRecord(current, result.count ? "restricted" : "cache");
}

function restrictionCandidate(
  previous: ShopEntitlement | null, error: unknown, now: Date,
): previous is ShopEntitlement {
  return error instanceof PartnerApiError && error.transport &&
    previous?.plan === Plan.PRO && Boolean(previous.graceUntil) &&
    previous.graceUntil!.getTime() <= now.getTime();
}

function restrictionData(now: Date) {
  return {
    plan: Plan.FREE,
    subscriptionStatus: SubscriptionStatus.UNKNOWN,
    confirmedAt: now,
    graceUntil: null,
    pendingPlan: null,
    pendingEffectiveAt: null,
    version: { increment: 1 },
  };
}

function verifiedValues(
  subscription: PartnerActiveSubscription | null,
  now: Date,
): EntitlementValues {
  if (!subscription) return freeValues(now);
  const plan = subscriptionPlan(subscription);
  return {
    plan,
    subscriptionStatus: subscriptionStatus(subscription),
    planHandle: currentPlanHandle(subscription),
    partnerSubscriptionId: subscription.legacySubscriptionId,
    confirmedAt: now,
    graceUntil:
      plan === Plan.PRO ? new Date(now.getTime() + PRO_GRACE_MS) : null,
    ...pendingValues(subscription),
  };
}

function freeValues(now: Date): EntitlementValues {
  return {
    plan: Plan.FREE,
    subscriptionStatus: SubscriptionStatus.CANCELLED,
    planHandle: null,
    partnerSubscriptionId: null,
    confirmedAt: now,
    graceUntil: null,
    pendingPlan: null,
    pendingEffectiveAt: null,
  };
}

function subscriptionPlan(subscription: PartnerActiveSubscription): Plan {
  const proHandle = getProPlanHandle();
  return subscription.items.some(
    (item) => item.handle === proHandle,
  )
    ? Plan.PRO
    : Plan.FREE;
}

function currentPlanHandle(
  subscription: PartnerActiveSubscription,
): string | null {
  const pro = subscription.items.find(
    (item) => item.handle === getProPlanHandle(),
  );
  return pro?.handle ?? subscription.items[0]?.handle ?? null;
}

function subscriptionStatus(
  subscription: PartnerActiveSubscription,
): SubscriptionStatus {
  return subscription.cancelAtEndOfCycle
    ? SubscriptionStatus.CANCEL_AT_PERIOD_END
    : SubscriptionStatus.ACTIVE;
}

function pendingValues(
  subscription: PartnerActiveSubscription,
): Pick<EntitlementValues, "pendingPlan" | "pendingEffectiveAt"> {
  const pendingPlan = pendingPlanFor(subscription);
  const endTime = subscription.currentBillingCycle?.endTime;
  return {
    pendingPlan,
    pendingEffectiveAt: pendingPlan && endTime ? new Date(endTime) : null,
  };
}

function pendingPlanFor(subscription: PartnerActiveSubscription): Plan | null {
  if (subscription.cancelAtEndOfCycle && !subscription.pendingUpdate)
    return Plan.FREE;
  if (!subscription.pendingUpdate) return null;
  const proHandle = getProPlanHandle();
  return subscription.pendingUpdate.items.some(
    (item) => item.handle === proHandle,
  )
    ? Plan.PRO
    : Plan.FREE;
}

async function saveEntitlement(
  shopId: string,
  values: EntitlementValues,
): Promise<ShopEntitlement> {
  return prisma.shopEntitlement.upsert({
    where: { shopId },
    create: { shopId, ...values },
    update: { ...values, version: { increment: 1 } },
  });
}

function isFresh(
  entitlement: ShopEntitlement | null,
  mode: BillingRefreshMode,
  now: Date,
): boolean {
  if (!entitlement?.confirmedAt || mode === "force") return false;
  return (
    now.getTime() - entitlement.confirmedAt.getTime() < cacheDuration(mode)
  );
}

function cacheDuration(mode: BillingRefreshMode): number {
  return mode === "quota" ? QUOTA_CACHE_MS : NORMAL_CACHE_MS;
}

function graceState(
  previous: ShopEntitlement | null,
  error: unknown,
  now: Date,
): BillingState | null {
  if (!(error instanceof PartnerApiError) || !error.transport) return null;
  if (previous?.plan !== Plan.PRO || !previous.graceUntil) return null;
  if (previous.graceUntil.getTime() <= now.getTime()) return null;
  return stateFromRecord(previous, "grace");
}

function stateFromRecord(
  record: ShopEntitlement,
  source: BillingSource,
): BillingState {
  return {
    shopId: record.shopId,
    plan: record.plan,
    subscriptionStatus: record.subscriptionStatus,
    planHandle: record.planHandle,
    partnerSubscriptionId: record.partnerSubscriptionId,
    confirmedAt: record.confirmedAt,
    graceUntil: record.graceUntil,
    pendingPlan: record.pendingPlan,
    pendingEffectiveAt: record.pendingEffectiveAt,
    source,
  };
}
