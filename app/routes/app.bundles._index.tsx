import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { activeBundleCount, listBundles } from "../features/bundles/bundle-repository.server";
import { bundleTitleMap } from "../features/bundles/content/bundle-titles.server";
import { BundleListPage } from "../features/bundles/ui/BundleListPage";
import { ensureShopContext } from "../features/installation/shop-context.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  const page = pageNumber(new URL(request.url).searchParams.get("page"));
  const [result, activeCount] = await Promise.all([listBundles(shop.id, page), activeBundleCount(shop.id)]);
  const titles = await bundleTitleMap(admin, result.bundles);
  const bundles = result.bundles.map((bundle) => ({ ...bundle, title: titles.get(bundle.publicId)! }));
  return { ...result, bundles, page, activeCount, plan: shop.entitlement?.plan ?? "FREE" };
}

function pageNumber(value: string | null): number {
  const page = Number(value ?? 0);
  return Number.isSafeInteger(page) && page > 0 ? page : 0;
}

export default function BundlesRoute() {
  const data = useLoaderData<typeof loader>();
  return <BundleListPage {...data} />;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
