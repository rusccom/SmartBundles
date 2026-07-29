import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  ShouldRevalidateFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { bundleEditorAction } from "../features/bundles/bundle-editor-action.server";
import { isBundleEditorActionData } from "../features/bundles/bundle-editor-action.types";
import { getBundleForEditor } from "../features/bundles/bundle-repository.server";
import { readProductContent } from "../features/bundles/content/shopify-product-content.server";
import "../features/bundles/editor/bundle-editor.css";
import { BundleEditorPage } from "../features/bundles/editor/BundleEditorPage";
import { hydrateEditorSelectors } from "../features/bundles/editor/bundle-editor-variant-display.server";
import { editorLocale } from "../features/bundles/editor/bundle-editor-locale.server";
import { ensureShopContext } from "../features/installation/shop-context.server";
import { isShopifyPricingEnabled } from "../features/billing/billing-config.server";
import { authenticate } from "../shopify.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  const bundle = await getBundleForEditor(shop.id, requiredId(params.bundleId));
  const [content, display] = await Promise.all([
    readProductContent(admin, bundle.parentProductGid, bundle.publicId),
    hydrateEditorSelectors(admin, bundle.selectors),
  ]);
  return {
    initial: {
      id: bundle.id, title: content.title, descriptionHtml: content.descriptionHtml,
      pricingMode: bundle.pricingMode, fixedPrice: fixedPrice(content, bundle.discountPercent),
      discountPercent: bundle.discountPercent, status: bundle.status,
      locale: editorLocale(request), ...display,
    },
    pricingEnabled: isShopifyPricingEnabled(),
  };
}

export function action({ request, params }: ActionFunctionArgs) {
  return bundleEditorAction(request, requiredId(params.bundleId));
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs): boolean {
  return isBundleEditorActionData(args.actionResult) ? false : args.defaultShouldRevalidate;
}

export default function EditBundleRoute() {
  return <BundleEditorPage {...useLoaderData<typeof loader>()} />;
}

function fixedPrice(
  content: Awaited<ReturnType<typeof readProductContent>>,
  discountPercent: string,
): string {
  if (content.compareAtPrice) return content.compareAtPrice;
  const multiplier = 1 - Number(discountPercent) / 100;
  return multiplier > 0 ? (Number(content.price) / multiplier).toFixed(2) : content.price;
}

function requiredId(value?: string): string {
  if (!value) throw new Response("Bundle not found", { status: 404 });
  return value;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
