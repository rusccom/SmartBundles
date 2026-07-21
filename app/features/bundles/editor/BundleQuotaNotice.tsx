export interface BundleQuotaNoticeProps {
  candidates: Array<{ id: string; title: string }>;
  pricingEnabled: boolean;
}

export function BundleQuotaNotice({ candidates, pricingEnabled }: BundleQuotaNoticeProps) {
  return <s-banner heading="Free plan limit reached" tone="warning">
    <s-stack direction="block" gap="base">
      <s-paragraph>{pricingEnabled
        ? "Free includes up to 3 active bundles. Upgrade to Pro or replace one active bundle."
        : "Free includes up to 3 active bundles. Replace one active bundle to continue."}</s-paragraph>
      <label className="sb-replacement">Bundle to pause<select name="replacementId" defaultValue="">
        <option value="" disabled>Choose an active bundle</option>
        {candidates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      {pricingEnabled ? <s-link href="/app/plans">Upgrade to Pro</s-link> : null}
    </s-stack>
  </s-banner>;
}
