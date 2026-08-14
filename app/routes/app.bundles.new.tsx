import { randomUUID } from "node:crypto";
import type {
  ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs, ShouldRevalidateFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { bundleEditorAction } from "../features/bundles/bundle-editor-action.server";
import "../features/bundles/editor/bundle-editor.css";
import { BundleEditorPage } from "../features/bundles/editor/BundleEditorPage";
import "../features/bundles/preview/bundle-preview.css";
import { ensureShopContext } from "../features/installation/shop-context.server";
import { getShopStorefrontSettings } from "../features/settings/storefront-settings-repository.server";
import { authenticate } from "../shopify.server";
import { signCreationToken } from "../features/bundles/content/content-token.server";
import { loadShopCurrencyCode } from "../features/bundles/editor/bundle-editor-variant-display.server";
import { editorLocale } from "../features/bundles/editor/bundle-editor-locale.server";
import { isBundleEditorActionData } from "../features/bundles/bundle-editor-action.types";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const creationToken = signCreationToken(session.shop, randomUUID());
  const [shop, currencyCode] = await Promise.all([
    ensureShopContext(admin, session.shop),
    loadShopCurrencyCode(admin),
  ]);
  const settings = await getShopStorefrontSettings(shop.id);
  return { initial: {
    title: "", descriptionHtml: "", image: null, creationToken,
    pricingMode: "FIXED" as const, fixedPrice: "", discountPercent: "0", status: "DRAFT" as const, currencyCode,
    locale: editorLocale(request), texts: settings.texts, selectors: [] } };
}

export function action({ request }: ActionFunctionArgs) {
  return bundleEditorAction(request, null);
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs): boolean {
  return isBundleEditorActionData(args.actionResult) ? false : args.defaultShouldRevalidate;
}

export default function NewBundleRoute() {
  const { initial } = useLoaderData<typeof loader>();
  return <BundleEditorPage initial={initial} />;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
