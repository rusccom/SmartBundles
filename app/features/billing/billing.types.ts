import type { Plan, SubscriptionStatus } from "@prisma/client";

export type BillingRefreshMode = "normal" | "quota" | "force";
export type BillingSource = "cache" | "partner" | "grace" | "restricted" | "complimentary";

export interface BillingState {
  shopId: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  planHandle: string | null;
  partnerSubscriptionId: string | null;
  confirmedAt: Date | null;
  graceUntil: Date | null;
  pendingPlan: Plan | null;
  pendingEffectiveAt: Date | null;
  source: BillingSource;
}

export interface PartnerSubscriptionItem {
  handle: string;
}

export interface PartnerPendingUpdate {
  items: Array<{ handle: string }>;
}

export interface PartnerActiveSubscription {
  cancelAtEndOfCycle: boolean;
  currentBillingCycle: { endTime: string } | null;
  items: PartnerSubscriptionItem[];
  pendingUpdate: PartnerPendingUpdate | null;
  legacySubscriptionId: string | null;
}
