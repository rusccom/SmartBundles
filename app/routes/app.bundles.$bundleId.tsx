import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { bundleEditorAction } from "../features/bundles/bundle-editor-action.server";
import { getBundleForEditor, listReplacementCandidates } from "../features/bundles/bundle-repository.server";
import { bundleTitleMap } from "../features/bundles/content/bundle-titles.server";
import { editorContentData } from "../features/bundles/content/content-sync.server";
import { readProductContent } from "../features/bundles/content/shopify-product-content.server";
import { recoverBundleSaveClaim } from "../features/bundles/bundle-save-recovery.server";
import "../features/bundles/editor/bundle-editor.css";
import { BundleEditorPage } from "../features/bundles/editor/BundleEditorPage";
import { ensureShopContext } from "../features/installation/shop-context.server";
import { isShopifyPricingEnabled } from "../features/billing/billing-config.server";
import { authenticate } from "../shopify.server";
import { hydrateEditorSelectors } from "../features/bundles/editor/bundle-editor-variant-display.server";
import { editorLocale } from "../features/bundles/editor/bundle-editor-locale.server";
import type { BundleEditorRecovery } from "../features/bundles/editor/editor.types";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  const id = requiredId(params.bundleId);
  const recovery = await recoverBundleSaveClaim(admin, shop.id, id);
  const bundle = await getBundleForEditor(shop.id, id);
  if (!bundle.parentProductGid) throw new Response("Bundle product not found", { status: 404 });
  const candidateLoad = listReplacementCandidates(shop.id, id);
  const [content, candidates, display] = await loadRouteData(admin, bundle, candidateLoad);
  const quotaCandidates = await titledCandidates(admin, candidates);
  return {
    initial: { ...editorInitial(bundle, content, session.shop, display), locale: editorLocale(request) },
    quotaCandidates,
    pricingEnabled: isShopifyPricingEnabled(),
    recovery: editorRecovery(recovery),
  };
}

function loadRouteData(
  admin: Parameters<typeof readProductContent>[0],
  bundle: Awaited<ReturnType<typeof getBundleForEditor>>,
  candidates: Promise<Awaited<ReturnType<typeof listReplacementCandidates>>>,
) {
  return Promise.all([
    readProductContent(admin, bundle.parentProductGid!, bundle.publicId),
    candidates,
    hydrateEditorSelectors(admin, bundle.selectors),
  ]);
}

function editorRecovery(
  recovery: Awaited<ReturnType<typeof recoverBundleSaveClaim>>,
): BundleEditorRecovery {
  if (recovery === "WAITING") return {
    state: "waiting",
    message: "A previous Shopify save is still being verified. Reload this page later.",
  };
  if (recovery === "RECOVERED" || recovery === "NOTICE") {
    return {
      state: "recovered",
      message: "An interrupted Shopify save was recovered. Review the content before saving.",
    };
  }
  return { state: "ready" };
}

export function action({ request, params }: ActionFunctionArgs) {
  return bundleEditorAction(request, requiredId(params.bundleId));
}

export default function EditBundleRoute() {
  const data = useLoaderData<typeof loader>();
  return <BundleEditorPage {...data} />;
}

function requiredId(value?: string): string {
  if (!value) throw new Response("Bundle not found", { status: 404 });
  return value;
}

function editorInitial(
  bundle: Awaited<ReturnType<typeof getBundleForEditor>>,
  content: Awaited<ReturnType<typeof readProductContent>>,
  shopDomain: string,
  display: Awaited<ReturnType<typeof hydrateEditorSelectors>>,
) {
  const productContent = editorContentData({ shopDomain, bundleId: bundle.id, lockVersion: bundle.lockVersion, content });
  return {
    id: bundle.id, version: String(bundle.lockVersion),
    editorRevision: bundle.draftRevision ?? bundle.activeRevision,
    ...productContent,
    pricingMode: bundle.pricingMode, fixedPrice: bundle.fixedPrice ?? "",
    discountPercent: bundle.discountPercent,
    status: bundle.status, ...display,
  };
}

async function titledCandidates(
  admin: Parameters<typeof bundleTitleMap>[0],
  candidates: Awaited<ReturnType<typeof listReplacementCandidates>>,
) {
  const titles = await bundleTitleMap(admin, candidates);
  return candidates.map(({ id, publicId }) => ({ id, title: titles.get(publicId)! }));
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
