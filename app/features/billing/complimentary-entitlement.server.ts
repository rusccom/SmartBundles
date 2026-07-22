import { Plan, SubscriptionStatus, type ShopEntitlement } from "@prisma/client";
import prisma from "../../db.server";
import type { BillingRefreshMode, BillingState } from "./billing.types";

const OWNER_SHOP_DOMAIN = "c1e90d-4.myshopify.com";
const COMPLIMENTARY_PLAN_HANDLE = "complimentary-owner";

export function isComplimentaryProShop(domain: string): boolean {
  return domain.trim().toLowerCase() === OWNER_SHOP_DOMAIN;
}

export async function ensureShopEntitlement(
  shopId: string,
  domain: string,
  current?: ShopEntitlement | null,
): Promise<ShopEntitlement> {
  if (isComplimentaryProShop(domain))
    return ensureComplimentaryEntitlement(shopId, current);
  if (current) return current;
  await prisma.shopEntitlement.createMany({
    data: [{ shopId, plan: Plan.FREE }],
    skipDuplicates: true,
  });
  return prisma.shopEntitlement.findUniqueOrThrow({ where: { shopId } });
}

export async function complimentaryBillingState(
  shopId: string,
  domain: string,
  current: ShopEntitlement | null,
  mode: BillingRefreshMode,
  now: Date,
): Promise<BillingState | null> {
  if (!isComplimentaryProShop(domain)) return null;
  const ensured = await ensureComplimentaryEntitlement(shopId, current);
  const record = mode === "force" ? await confirmEntitlement(shopId, now) : ensured;
  return stateFromRecord(record);
}

async function ensureComplimentaryEntitlement(
  shopId: string,
  current?: ShopEntitlement | null,
): Promise<ShopEntitlement> {
  if (isComplimentaryRecord(current)) return current;
  const values = complimentaryValues(new Date());
  return prisma.shopEntitlement.upsert({
    where: { shopId },
    create: { shopId, ...values },
    update: { ...values, version: { increment: 1 } },
  });
}

function confirmEntitlement(shopId: string, now: Date): Promise<ShopEntitlement> {
  return prisma.shopEntitlement.update({
    where: { shopId },
    data: {
      ...complimentaryValues(now),
      billingPolledAt: now,
      version: { increment: 1 },
    },
  });
}

function isComplimentaryRecord(
  record?: ShopEntitlement | null,
): record is ShopEntitlement {
  return record?.plan === Plan.PRO &&
    record.subscriptionStatus === SubscriptionStatus.ACTIVE &&
    record.planHandle === COMPLIMENTARY_PLAN_HANDLE &&
    record.partnerSubscriptionId === null && record.graceUntil === null &&
    record.pendingPlan === null && record.pendingEffectiveAt === null &&
    Boolean(record.confirmedAt);
}

function complimentaryValues(now: Date) {
  return {
    plan: Plan.PRO,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    planHandle: COMPLIMENTARY_PLAN_HANDLE,
    partnerSubscriptionId: null,
    confirmedAt: now,
    graceUntil: null,
    pendingPlan: null,
    pendingEffectiveAt: null,
  };
}

function stateFromRecord(record: ShopEntitlement): BillingState {
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
    source: "complimentary",
  };
}
