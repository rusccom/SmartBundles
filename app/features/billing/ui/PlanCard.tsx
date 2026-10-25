export interface PlanCardProps {
  name: string;
  price: string;
  description: string;
  current: boolean;
  actionUrl?: string;
}

export function PlanCard({ name, price, description, current, actionUrl }: PlanCardProps) {
  return <s-section heading={name}>
    <s-stack direction="block" gap="base">
      <s-text type="strong" fontSize="large">{price}</s-text>
      <s-paragraph>{description}</s-paragraph>
      {current ? <s-badge tone="success">Current plan</s-badge> : actionUrl ? <s-button href={actionUrl} target="_top">Choose plan</s-button> : <s-banner tone="warning">Pro is not available yet.</s-banner>}
    </s-stack>
  </s-section>;
}
