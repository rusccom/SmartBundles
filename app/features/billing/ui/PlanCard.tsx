export interface PlanCardProps {
  name: string;
  price: string;
  description: string;
  current: boolean;
  actionUrl?: string;
}

export function PlanCard({ name, price, description, current, actionUrl }: PlanCardProps) {
  return <s-section heading={name}>
    {current ? <s-badge slot="supplemental" tone="success">Current plan</s-badge> : null}
    <s-stack direction="block" gap="base">
      <s-text type="strong" fontSize="large">{price}</s-text>
      <s-paragraph>{description}</s-paragraph>
      {current ? null : planAction(actionUrl)}
    </s-stack>
  </s-section>;
}

function planAction(actionUrl?: string) {
  if (!actionUrl) return <s-paragraph color="subdued">Plan changes are not available yet.</s-paragraph>;
  return <s-button href={actionUrl} target="_top">Choose plan</s-button>;
}
