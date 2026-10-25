import { PlanCard } from "./PlanCard";

export interface PlansPageProps {
  plan: "FREE" | "PRO";
  pricingUrl?: string;
  message?: string;
  pendingEffectiveAt?: string;
}

export function PlansPage({ plan, pricingUrl, message, pendingEffectiveAt }: PlansPageProps) {
  return <s-page heading="Plans">
    {message ? <s-banner tone="info">{message}</s-banner> : null}
    {pendingEffectiveAt ? <s-banner tone="warning">Your plan changes at the end of the billing cycle on {new Date(pendingEffectiveAt).toLocaleDateString()}.</s-banner> : null}
    <s-query-container>
      <s-grid gridTemplateColumns='@container (inline-size >= 600px) "repeat(2, minmax(0, 1fr))", "minmax(0, 1fr)"' gap="base">
        <PlanCard name="Free" price="$0" description="Up to 3 active bundles. Unlimited drafts." current={plan === "FREE"} actionUrl={pricingUrl} />
        <PlanCard name="Pro" price="$7 USD/month" description="Unlimited active bundles. All bundle features included." current={plan === "PRO"} actionUrl={pricingUrl} />
      </s-grid>
    </s-query-container>
  </s-page>;
}
