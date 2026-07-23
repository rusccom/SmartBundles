import { randomUUID } from "node:crypto";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { bundleEditorAction } from "../features/bundles/bundle-editor-action.server";
import "../features/bundles/editor/bundle-editor.css";
import { BundleEditorPage } from "../features/bundles/editor/BundleEditorPage";
import { authenticate } from "../shopify.server";
import { signCreationToken } from "../features/bundles/content/content-token.server";
import { loadShopCurrencyCode } from "../features/bundles/editor/bundle-editor-variant-display.server";
import { editorLocale } from "../features/bundles/editor/bundle-editor-locale.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const creationToken = signCreationToken(session.shop, randomUUID());
  const currencyCode = await loadShopCurrencyCode(admin);
  return { initial: { version: "new", editorRevision: null,
    title: "", descriptionHtml: "", creationToken,
    pricingMode: "FIXED" as const, fixedPrice: "", discountPercent: "0", status: "DRAFT", currencyCode,
    locale: editorLocale(request), selectors: [] } };
}

export function action({ request }: ActionFunctionArgs) {
  return bundleEditorAction(request, null);
}

export default function NewBundleRoute() {
  const { initial } = useLoaderData<typeof loader>();
  return <BundleEditorPage initial={initial} />;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
