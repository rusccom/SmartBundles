import type { AdminClient } from "../shopify/admin-api.server";
import { buildPresentationConfig, buildRuntimeConfig, disabledRuntime } from "./bundle-config.server";
import { bundleCompareAtPrice, calculateBundlePrices } from "./bundle-pricing";
import {
  getBundleForAction,
  getBundleForProjection,
  setBundleStatus,
} from "./bundle-repository.server";
import type { BundleDraftInput } from "./bundle.types";
import { readProductContent } from "./content/shopify-product-content.server";
import {
  publishProduct,
  setProductStatus,
  unpublishProduct,
  updateParentVariant,
  writeProductMetafields,
} from "./shopify-product.server";
import { hydrateProjectionSelectors } from "./projection-selector-hydration.server";

export async function syncActiveBundle(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
  submitted?: BundleDraftInput,
): Promise<void> {
  const bundle = await getBundleForProjection(shopId, bundleId);
  await writeProjection(admin, bundle, submitted);
}

export async function syncBundlePresentation(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
): Promise<void> {
  const bundle = await getBundleForProjection(shopId, bundleId);
  const draft = await projectionDraft(admin, bundle);
  const projection = buildProjection(bundle, draft);
  await writeProductMetafields(
    admin, bundle.parentProductGid, [projection.presentation],
  );
}

async function writeProjection(
  admin: AdminClient,
  bundle: ProjectionBundle,
  submitted?: BundleDraftInput,
): Promise<void> {
  const draft = await projectionDraft(admin, bundle, submitted);
  const projection = buildProjection(bundle, draft);
  await Promise.all([
    updateParentVariant(admin, {
      productId: bundle.parentProductGid,
      variantId: bundle.parentVariantGid,
      price: projection.price,
      compareAtPrice: projection.compareAtPrice,
    }),
    writeProductMetafields(admin, bundle.parentProductGid, projection.fields),
  ]);
}

export async function activateBundle(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
  submitted?: BundleDraftInput,
): Promise<void> {
  const bundle = await getBundleForProjection(shopId, bundleId);
  const publicationId = requiredPublication(bundle.shop.onlineStorePublicationGid);
  await writeProjection(admin, bundle, submitted);
  await Promise.all([
    setProductStatus(admin, { id: bundle.parentProductGid, status: "ACTIVE" }),
    publishProduct(admin, bundle.parentProductGid, publicationId),
  ]);
  await setBundleStatus(shopId, bundleId, "ACTIVE");
}

export async function draftBundle(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
  submitted?: BundleDraftInput,
): Promise<void> {
  const bundle = await getBundleForProjection(shopId, bundleId);
  const publicationId = requiredPublication(bundle.shop.onlineStorePublicationGid);
  const runtime = JSON.stringify(disabledRuntime(bundle.publicId, bundle.parentVariantGid));
  const operations = [
    writeProductMetafields(admin, bundle.parentProductGid, [
      { key: "bundle_runtime", value: runtime },
    ]),
    setProductStatus(admin, { id: bundle.parentProductGid, status: "DRAFT" }),
    unpublishProduct(admin, bundle.parentProductGid, publicationId),
    ...draftPriceOperation(admin, bundle, submitted),
  ];
  await Promise.all(operations);
  await setBundleStatus(shopId, bundleId, "DRAFT");
}

function draftPriceOperation(
  admin: AdminClient,
  bundle: ProjectionBundle,
  submitted?: BundleDraftInput,
): Array<Promise<void>> {
  if (submitted?.pricingMode !== "FIXED") return [];
  return [updateParentVariant(admin, parentVariantInput(bundle, submitted))];
}

export async function saveDraftPrice(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
  draft: BundleDraftInput,
): Promise<void> {
  if (draft.pricingMode !== "FIXED") return;
  const bundle = await getBundleForAction(shopId, bundleId);
  await updateParentVariant(admin, parentVariantInput(bundle, draft));
}

function parentVariantInput(bundle: ParentBundle, draft: BundleDraftInput) {
  const prices = calculateBundlePrices(draft);
  return {
    productId: bundle.parentProductGid, variantId: bundle.parentVariantGid,
    price: prices.finalPrice, compareAtPrice: bundleCompareAtPrice(prices),
  };
}

async function projectionDraft(
  admin: AdminClient,
  bundle: ProjectionBundle,
  submitted?: BundleDraftInput,
): Promise<BundleDraftInput> {
  if (submitted) return hydrateSubmittedDraft(admin, submitted);
  const source = storedDraft(bundle);
  const [selectors, fixedPrice] = await Promise.all([
    hydrateProjectionSelectors(admin, source.selectors),
    storedFixedPrice(admin, bundle),
  ]);
  return { ...source, fixedPrice, selectors };
}

async function hydrateSubmittedDraft(
  admin: AdminClient,
  submitted: BundleDraftInput,
): Promise<BundleDraftInput> {
  const selectors = await hydrateProjectionSelectors(admin, submitted.selectors);
  return { ...submitted, selectors };
}

function storedFixedPrice(admin: AdminClient, bundle: ProjectionBundle): Promise<string | null> {
  return bundle.pricingMode === "FIXED" ? currentFixedPrice(admin, bundle) : Promise.resolve(null);
}

function storedDraft(bundle: ProjectionBundle): BundleDraftInput {
  return {
    pricingMode: bundle.pricingMode,
    fixedPrice: null,
    discountPercent: bundle.discountPercent,
    selectors: bundle.selectors,
  };
}

async function currentFixedPrice(admin: AdminClient, bundle: ProjectionBundle): Promise<string> {
  const content = await readProductContent(admin, bundle.parentProductGid, bundle.publicId);
  return content.compareAtPrice ?? undiscountedPrice(content.price, bundle.discountPercent);
}

function undiscountedPrice(price: string, discountPercent: string): string {
  const multiplier = 1 - Number(discountPercent) / 100;
  if (multiplier <= 0) return price;
  return (Number(price) / multiplier).toFixed(2);
}

function buildProjection(bundle: ProjectionBundle, draft: BundleDraftInput) {
  const prices = calculateBundlePrices(draft);
  const identity = projectionIdentity(bundle, draft, prices);
  const presentation = {
    key: "bundle_presentation" as const,
    value: JSON.stringify(buildPresentationConfig(identity, draft.selectors, {
      version: bundle.shop.storefrontTextVersion,
      texts: bundle.storefrontTexts,
    })),
  };
  return {
    price: prices.finalPrice,
    compareAtPrice: bundleCompareAtPrice(prices),
    presentation,
    fields: [
      { key: "bundle_runtime" as const, value: JSON.stringify(buildRuntimeConfig(identity, draft.selectors)) },
      presentation,
    ],
  };
}

function projectionIdentity(
  bundle: ProjectionBundle,
  draft: BundleDraftInput,
  prices: ReturnType<typeof calculateBundlePrices>,
) {
  return {
    publicId: bundle.publicId, parentVariantId: bundle.parentVariantGid,
    pricingMode: draft.pricingMode, currencyCode: requiredCurrency(bundle.shop.currencyCode),
    discountPercent: draft.discountPercent, originalPrice: prices.originalPrice,
    parentPrice: prices.finalPrice, maximumOriginalPrice: prices.maximumOriginalPrice,
    maximumFinalPrice: prices.maximumFinalPrice,
  };
}

function requiredPublication(value: string | null): string {
  if (!value) throw new Error("Online Store publication is unavailable.");
  return value;
}

function requiredCurrency(value: string | null): string {
  if (!value) throw new Error("Shop currency is unavailable.");
  return value;
}

type ProjectionBundle = Awaited<ReturnType<typeof getBundleForProjection>>;
type ParentBundle = Pick<ProjectionBundle, "parentProductGid" | "parentVariantGid">;
