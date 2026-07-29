import { Plan } from "@prisma/client";
import prisma from "../../db.server";
import { getBillingState } from "../billing/index.server";

export const FREE_ACTIVE_BUNDLE_LIMIT = 3;

export interface BundleQuotaSnapshot {
  plan: Plan;
  used: number;
  limit: number | null;
  remaining: number | null;
  canActivate: boolean;
}

export async function getBundleQuota(
  shopId: string,
): Promise<BundleQuotaSnapshot> {
  const billing = await getBillingState(shopId, "quota");
  const used = await prisma.bundle.count({ where: { shopId, status: "ACTIVE" } });
  return quotaSnapshot(billing.plan, used);
}

function quotaSnapshot(plan: Plan, used: number): BundleQuotaSnapshot {
  if (plan === Plan.PRO)
    return { plan, used, limit: null, remaining: null, canActivate: true };
  const remaining = Math.max(0, FREE_ACTIVE_BUNDLE_LIMIT - used);
  return {
    plan,
    used,
    limit: FREE_ACTIVE_BUNDLE_LIMIT,
    remaining,
    canActivate: remaining > 0,
  };
}
