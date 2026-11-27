import type { AdminClient } from "../shopify/admin-api.server";
import { buildPresentationConfig, buildRuntimeConfig, disabledRuntime } from "./bundle-config.server";
import { bundlePrice } from "./bundle-pricing";
import {
  getBundleForAction,
  getBundleForProjection,
  setBundleStatus,
} from "./bundle-repository.server";
import type { BundleDraftInput } from "./bundle.types";
import {
  publishProduct,
  setProductStatus,
  unpublishProduct,
  updateParentVariant,
  writeProductMetafields,
} from "./shopify-product.server";
import { hydrateProjectionSelectors } from "./projection-selector-hydration.server";
import { variantReferenceFields } from "./storefront/variant-references.server";
import { syncBundleMemberships } from "./storefront/bundle-membership.server";
import { recordComponentHealth } from "./component-health.server";
import { writeUnavailableProjection } from "./unavailable-projection.server";

export async function syncActiveBundle(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
  submitted?: BundleDraftInput,
): Promise<void> {
  const bundle = await getBundleForProjection(shopId, bundleId);
  await writeProjection(admin, bundle, submitted);
}

async function writeProjection(
  admin: AdminClient,
  bundle: ProjectionBundle,
  submitted?: BundleDraftInput,
): Promise<void> {
  const draft = submitted ?? await storedProjectionDraft(admin, bundle);
  if (draft.selectors.some(({ options }) => !options.length)) {
    await writeUnavailableProjection(admin, bundle, draft);
    return recordComponentHealth(bundle.shopId, bundle.id, draft.selectors);
  }
  await Promise.all([
    updateParentPrice(admin, bundle, draft),
    writeProductMetafields(admin, bundle.parentProductGid, projectionFields(bundle, draft)),
  ]);
  await syncMemberships(admin, bundle, draft, draft.pricingMode === "DYNAMIC");
  await recordComponentHealth(bundle.shopId, bundle.id, draft.selectors);
}

function syncMemberships(admin: AdminClient, bundle: ProjectionBundle, draft: BundleDraftInput, enabled: boolean) {
  return syncBundleMemberships(admin, {
    publicId: bundle.publicId, parentVariantId: bundle.parentVariantGid,
    discountPercent: draft.discountPercent, selectors: draft.selectors,
    previousSelectors: bundle.selectors, enabled,
  });
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
  await Promise.all([
    writeProductMetafields(admin, bundle.parentProductGid, [
      { key: "bundle_runtime", value: JSON.stringify(disabledRuntime(bundle.publicId, bundle.parentVariantGid)) },
    ]),
    setProductStatus(admin, { id: bundle.parentProductGid, status: "DRAFT" }),
    unpublishProduct(admin, bundle.parentProductGid, publicationId),
    submitted?.pricingMode === "FIXED" ? updateParentPrice(admin, bundle, submitted) : Promise.resolve(),
  ]);
  await syncMemberships(admin, bundle, submitted ?? storedDraft(bundle), false);
  await setBundleStatus(shopId, bundleId, "DRAFT");
}

export async function saveDraftPrice(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
  draft: BundleDraftInput,
): Promise<void> {
  if (draft.pricingMode !== "FIXED") return;
  await updateParentPrice(admin, await getBundleForAction(shopId, bundleId), draft);
}

function updateParentPrice(admin: AdminClient, bundle: ParentBundle, draft: BundleDraftInput): Promise<void> {
  if (draft.pricingMode === "FIXED" && draft.fixedPrice === null) return Promise.resolve();
  const prices = bundlePrice.calculate(draft);
  return updateParentVariant(admin, {
    productId: bundle.parentProductGid, variantId: bundle.parentVariantGid,
    price: prices.finalPrice, compareAtPrice: bundlePrice.compareAt(prices),
  });
}

async function storedProjectionDraft(admin: AdminClient, bundle: ProjectionBundle): Promise<BundleDraftInput> {
  const selectors = await hydrateProjectionSelectors(admin, bundle.selectors, true);
  return { ...storedDraft(bundle), selectors };
}

function storedDraft(bundle: ProjectionBundle): BundleDraftInput {
  return {
    pricingMode: bundle.pricingMode,
    fixedPrice: null,
    discountPercent: bundle.discountPercent,
    selectors: bundle.selectors,
  };
}

function projectionFields(bundle: ProjectionBundle, draft: BundleDraftInput) {
  const identity = {
    publicId: bundle.publicId, parentVariantId: bundle.parentVariantGid,
    pricingMode: draft.pricingMode, discountPercent: draft.discountPercent,
  };
  return [
    { key: "bundle_runtime" as const, value: JSON.stringify(buildRuntimeConfig(identity, draft.selectors)) },
    { key: "bundle_presentation" as const, value: JSON.stringify(buildPresentationConfig(identity, draft.selectors)) },
    ...variantReferenceFields(draft.selectors),
  ];
}

function requiredPublication(value: string | null): string {
  if (!value) throw new Error("Online Store publication is unavailable.");
  return value;
}

type ProjectionBundle = Awaited<ReturnType<typeof getBundleForProjection>>;
type ParentBundle = Pick<ProjectionBundle, "parentProductGid" | "parentVariantGid">;
