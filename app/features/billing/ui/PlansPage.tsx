import { PlanCard } from "./PlanCard";

export interface PlansPageProps {
  plan: "FREE" | "PRO";
  complimentary: boolean;
  pricingUrl?: string;
  message?: string;
  pendingEffectiveAt?: string;
}

export function PlansPage({ plan, complimentary, pricingUrl, message, pendingEffectiveAt }: PlansPageProps) {
  return <s-page heading="Plans">
    {message ? <s-banner tone="info">{message}</s-banner> : null}
    {pendingEffectiveAt ? <s-banner tone="warning">Your plan changes at the end of the billing cycle on {new Date(pendingEffectiveAt).toLocaleDateString()}.</s-banner> : null}
    <s-section>
      <div className="sb-plan-grid">
        <PlanCard name="Free" price="$0" description="Up to 3 active bundles. Unlimited drafts." current={plan === "FREE"} actionUrl={pricingUrl} />
        <PlanCard name="Pro" price={complimentary ? "Complimentary" : "$7 USD/month"} description="Unlimited active bundles. All bundle features included." current={plan === "PRO"} actionUrl={pricingUrl} />
      </div>
    </s-section>
  </s-page>;
}
