import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
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
  const params = new URL(request.url).searchParams;
  return {
    settings,
    savedMessage: savedMessage(params.get("saved"), params.get("failed")),
  };
}

export function action({ request }: ActionFunctionArgs) {
  return storefrontSettingsAction(request);
}

export default function SettingsRoute() {
  const route = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <StorefrontSettingsPage
      {...route}
      errors={actionData?.errors}
      message={actionData?.message}
    />
  );
}

function savedMessage(saved: string | null, failed: string | null): string | undefined {
  const synced = countParam(saved);
  const failures = countParam(failed);
  if (synced === undefined || failures === undefined) return undefined;
  if (failures) return `Texts saved. Updated ${synced} bundles; ${failures} could not be updated.`;
  if (!synced) return "Texts saved. There are no active bundles to update.";
  return `Texts saved and applied to ${synced} active ${synced === 1 ? "bundle" : "bundles"}.`;
}

function countParam(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : undefined;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
