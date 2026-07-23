import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ensureShopContext } from "../features/installation/shop-context.server";
import { storefrontSettingsAction } from "../features/settings/storefront-settings-action.server";
import { getShopStorefrontSettings } from "../features/settings/storefront-settings-repository.server";
import "../features/settings/ui/storefront-settings.css";
import { StorefrontSettingsPage } from "../features/settings/ui/StorefrontSettingsPage";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  const settings = await getShopStorefrontSettings(shop.id);
  const saved = new URL(request.url).searchParams.get("saved");
  return { settings, savedMessage: savedMessage(saved) };
}

export function action({ request }: ActionFunctionArgs) {
  return storefrontSettingsAction(request);
}

export default function SettingsRoute() {
  const route = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return <StorefrontSettingsPage {...route} errors={actionData?.errors}
    message={actionData?.message} />;
}

function savedMessage(value: string | null): string | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const count = Number(value);
  if (!Number.isSafeInteger(count)) return undefined;
  if (!count) return "Texts saved. They will be used by future bundle publications.";
  const noun = count === 1 ? "bundle" : "bundles";
  return `Texts saved. Storefront updates were queued for ${count} active ${noun}.`;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
