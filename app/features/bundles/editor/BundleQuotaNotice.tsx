export interface BundleQuotaNoticeProps {
  pricingEnabled: boolean;
}

export function BundleQuotaNotice(props: BundleQuotaNoticeProps) {
  return <s-banner heading="Free plan limit reached" tone="warning">
    <s-stack direction="block" gap="base">
      <s-paragraph>Free includes up to 3 active bundles. Move another bundle to Draft first.</s-paragraph>
      {props.pricingEnabled ? <s-link href="/app/plans">Upgrade to Pro</s-link> : null}
    </s-stack>
  </s-banner>;
}
