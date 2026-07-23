export interface BundleQuotaNoticeProps {
  candidates: Array<{ id: string; title: string }>;
  pricingEnabled: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function BundleQuotaNotice(props: BundleQuotaNoticeProps) {
  return <s-banner heading="Free plan limit reached" tone="warning">
    <s-stack direction="block" gap="base">
      <s-paragraph>{props.pricingEnabled
        ? "Free includes up to 3 active bundles. Upgrade to Pro or replace one active bundle."
        : "Free includes up to 3 active bundles. Replace one active bundle to continue."}</s-paragraph>
      <label className="sb-replacement">Bundle to pause
        <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
          <option value="" disabled>Choose an active bundle</option>
          {props.candidates.map((item) =>
            <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      {props.pricingEnabled ? <s-link href="/app/plans">Upgrade to Pro</s-link> : null}
    </s-stack>
  </s-banner>;
}
