export interface PlanCardProps {
  name: string;
  price: string;
  description: string;
  current: boolean;
  actionUrl?: string;
}

export function PlanCard({ name, price, description, current, actionUrl }: PlanCardProps) {
  return <s-box padding="large" borderWidth="base" borderRadius="base">
    <s-stack direction="block" gap="base">
      <s-heading>{name}</s-heading>
      <s-heading>{price}</s-heading>
      <s-paragraph>{description}</s-paragraph>
      {current ? <s-badge tone="success">Current plan</s-badge> : actionUrl ? <s-link href={actionUrl} target="_top">Choose plan</s-link> : <s-banner tone="warning">Pro is not available yet.</s-banner>}
    </s-stack>
  </s-box>;
}
