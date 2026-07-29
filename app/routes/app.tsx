import type { HeadersFunction, LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { ensureShopContext } from "../features/installation/shop-context.server";
import { StorefrontActivationBanner } from "../features/installation/StorefrontActivationBanner";
import { storefrontEditorUrl } from "../features/installation/storefront-editor-url.server";
import { authenticate } from "../shopify.server";
import { isBundleEditorActionData } from "../features/bundles/bundle-editor-action.types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  return { apiKey: process.env.SHOPIFY_API_KEY || "", shop, themeEditorUrl: storefrontEditorUrl(session.shop) };
};

export default function App() {
  const { apiKey, shop, themeEditorUrl } = useLoaderData<typeof loader>();
  const setupError = shopSetupError(shop);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app/bundles">Bundles</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/plans">Plans</s-link>
      </s-app-nav>
      {setupError ? <s-banner tone="critical">{setupError}</s-banner> : null}
      <StorefrontActivationBanner editorUrl={themeEditorUrl} />
      <Outlet />
    </AppProvider>
  );
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs): boolean {
  return isBundleEditorActionData(args.actionResult) ? false : args.defaultShouldRevalidate;
}

function shopSetupError(shop: Awaited<ReturnType<typeof ensureShopContext>>): string | undefined {
  if (!shop.eligibleForBundles) return shop.ineligibilityReason || "This shop is not eligible for bundles.";
  if (!shop.cartTransformGid) return "SmartBundle Cart Transform is not installed. Redeploy the app extension and reload.";
  if (!shop.onlineStorePublicationGid) return "The Online Store sales channel is required to publish bundles.";
  return undefined;
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export { AppErrorBoundary as ErrorBoundary } from "../features/shell/AppErrorBoundary";
