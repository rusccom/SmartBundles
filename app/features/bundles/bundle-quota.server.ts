import { Plan, Prisma } from "@prisma/client";
import prisma from "../../db.server";
import { getBillingState } from "../billing/index.server";
export { QuotaExceededError } from "./quota-exceeded-error";

export const FREE_ACTIVE_BUNDLE_LIMIT = 3;
const MAX_TRANSACTION_ATTEMPTS = 4;

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
  const used = await prisma.bundle.count({
    where: { shopId, countsTowardQuota: true },
  });
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

export async function serializable<T>(
  work: (transaction: Prisma.TransactionClient) => Promise<T>,
  timeout = 5_000,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout,
      });
    } catch (error) {
      if (!isRetryable(error) || attempt === MAX_TRANSACTION_ATTEMPTS)
        throw error;
    }
  }
  throw new Error("Quota transaction failed.");
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}
