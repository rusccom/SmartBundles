import { ShopLoginForm } from "./ShopLoginForm";
import { POLARIS_URL } from "../shell/polaris";

export interface LandingPageProps { pricingEnabled: boolean }

export function LandingPage({ pricingEnabled }: LandingPageProps) {
  return <>
    <script src={POLARIS_URL} />
    <s-page heading="SmartBundle for Shopify" inlineSize="small">
      <s-section>
        <s-paragraph>Create bundles with a fixed or dynamic price where customers choose one allowed variant for every component.</s-paragraph>
      </s-section>
      <s-section heading="Log in">
        <ShopLoginForm />
      </s-section>
      <s-section heading="Build your bundles"><s-stack gap="base">
        <s-paragraph><s-text type="strong">Flexible choices.</s-text> Offer up to 150 components without variant-combination explosion.</s-paragraph>
        <s-paragraph><s-text type="strong">Native checkout.</s-text> Shopify expands each bundle into the selected variants in cart and orders.</s-paragraph>
        <s-paragraph><s-text type="strong">Simple pricing.</s-text> {pricingEnabled
          ? "Free for 3 active bundles or Pro for $7 USD per month."
          : "Free for up to 3 active bundles."}</s-paragraph>
      </s-stack></s-section>
    </s-page>
  </>;
}
