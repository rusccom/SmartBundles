import { ShopLoginForm } from "./ShopLoginForm";
import styles from "./landing.module.css";

export interface LandingPageProps { pricingEnabled: boolean }

export function LandingPage({ pricingEnabled }: LandingPageProps) {
  return <main className={styles.index}>
    <div className={styles.content}>
      <h1 className={styles.heading}>SmartBundle for Shopify</h1>
      <p className={styles.text}>Create fixed-price bundles where customers choose one allowed variant for every component.</p>
      <ShopLoginForm />
      <ul className={styles.list}>
        <li><strong>Flexible choices.</strong> Offer up to 30 component selectors without variant-combination explosion.</li>
        <li><strong>Native checkout.</strong> Shopify expands each bundle into the selected variants in cart and orders.</li>
        <li><strong>Simple pricing.</strong> {pricingEnabled
          ? "Free for 3 active bundles or Pro for $7 USD per month."
          : "Free for up to 3 active bundles."}</li>
      </ul>
    </div>
  </main>;
}
