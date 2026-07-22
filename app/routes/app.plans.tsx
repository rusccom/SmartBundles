import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getBillingState, getPricingUrl } from "../features/billing/index.server";
import "../features/billing/ui/plans.css";
import { PlansPage } from "../features/billing/ui/PlansPage";
import { ensureShopContext } from "../features/installation/shop-context.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  const state = await billingState(shop.id, shop.entitlement?.plan ?? "FREE");
  const url = new URL(request.url);
  return { plan: state.plan, complimentary: state.source === "complimentary", pendingEffectiveAt: state.pendingEffectiveAt?.toISOString(), pricingUrl: pricingUrl(session.shop), message: planMessage(url) };
}

async function billingState(shopId: string, fallback: "FREE" | "PRO") {
  try { return await getBillingState(shopId); }
  catch { return { plan: fallback, pendingEffectiveAt: null, source: "cache" as const }; }
}

function pricingUrl(shop: string): string | undefined {
  try { return getPricingUrl(shop); }
  catch { return undefined; }
}

function planMessage(url: URL): string | undefined {
  if (url.searchParams.has("verified")) return "Your Shopify App Pricing subscription was verified.";
  if (url.searchParams.has("verification")) return "Your plan could not be verified yet. No entitlement was changed.";
  return undefined;
}

export default function PlansRoute() {
  return <PlansPage {...useLoaderData<typeof loader>()} />;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
