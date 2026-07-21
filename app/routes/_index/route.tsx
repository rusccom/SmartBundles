import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";
import { isShopifyPricingEnabled } from "../../features/billing/billing-config.server";
import { LandingPage } from "../../features/landing/LandingPage";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) throw redirect(`/app?${url.searchParams.toString()}`);
  return { pricingEnabled: isShopifyPricingEnabled() };
}

export default function IndexRoute() {
  return <LandingPage {...useLoaderData<typeof loader>()} />;
}
