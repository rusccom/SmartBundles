import { BundleStatus, Prisma } from "@prisma/client";
import type { AdminClient } from "../shopify/admin-api.server";
import {
  buildPresentationConfig,
  buildRuntimeConfig,
  jsonProjection,
  projectionHash,
} from "./bundle-config.server";
import {
  loadPublicationBundle,
  loadPublicationBundleAtRevision,
} from "./bundle-repository.server";
import {
  saveProjection,
} from "./publication-repository.server";
import type { ParentProductIds } from "./shopify-product.server";
import type { PresentationConfig, RuntimeConfig } from "./bundle.types";
import { verifyBundleSelectors } from "./variant-validation.server";
import { repairParentProjection } from "../operations/parent-projection.server";
import {
  createBundleClaimGuard,
} from "../operations/operation-claim-guard.server";
import type { OperationGuard } from "../operations/operation-claim-guard.server";
import { calculateParentPrice } from "./bundle-pricing";
import { bundleProjectionError } from "./bundle-projection-error.server";

export async function preparePublication(
  admin: AdminClient,
  bundleId: string,
  shopId: string,
  revision?: number,
) {
  const loaded = revision
    ? await loadPublicationBundleAtRevision(bundleId, revision)
    : await loadPublicationBundle(bundleId);
  assertShop(loaded.bundle.shopId, shopId);
  const publicationId = loaded.bundle.shop.onlineStorePublicationGid;
  if (!publicationId) throw new Error("Online Store publication is unavailable.");
  const selectors = await verifyBundleSelectors(admin, loaded.selectors, publicationId);
  const prepared = { ...loaded, selectors };
  assertProjectable(prepared);
  return prepared;
}

export type PreparedPublication = Awaited<ReturnType<typeof preparePublication>>;

export async function publishPrepared(
  admin: AdminClient,
  prepared: PreparedPublication,
  claimVersion: number,
): Promise<PublicationResult> {
  const guard = publicationGuard(prepared.bundle.id, claimVersion);
  const parent = requiredParentProduct(prepared);
  const projected = projectPublication(prepared, parent.variantId);
  const fields = await repairParentProjection(admin, parentProjection(projected, parent, guard));
  await persistPreparedProjection(projected, fields.runtime, fields.presentation, claimVersion);
  return {
    runtimeDigest: fields.runtime.compareDigest,
    presentationDigest: fields.presentation.compareDigest,
  };
}

function publicationGuard(bundleId: string, lockVersion: number): OperationGuard {
  return createBundleClaimGuard({
    bundleId,
    lockVersion,
    statuses: [BundleStatus.PUBLISHING, BundleStatus.UPDATING],
  });
}

export interface PublicationResult {
  runtimeDigest: string;
  presentationDigest: string;
}

function projectPublication(prepared: PreparedPublication, parentVariantId: string) {
  try {
    const parentPrice = calculateParentPrice(
      prepared.source.pricingMode, prepared.source.fixedPrice, prepared.selectors);
    const identity = projectionIdentity(prepared, parentVariantId, parentPrice);
    const runtime = buildRuntimeConfig(identity, prepared.selectors);
    const presentation = buildPresentationConfig(identity, prepared.selectors);
    return projectedPublication(prepared, runtime, presentation, parentPrice);
  } catch (error) {
    throw bundleProjectionError(error);
  }
}

function assertProjectable(prepared: PreparedPublication): void {
  projectPublication(prepared, requiredParentProduct(prepared).variantId);
}

function projectedPublication(
  prepared: PreparedPublication, runtime: RuntimeConfig,
  presentation: PresentationConfig, parentPrice: string,
) {
  return {
    ...prepared, runtime, presentation, parentPrice,
    runtimeValue: jsonProjection(runtime), presentationValue: jsonProjection(presentation),
  };
}

function projectionIdentity(
  prepared: PreparedPublication,
  parentVariantId: string,
  parentPrice: string,
) {
  return {
    publicId: prepared.bundle.publicId,
    revision: prepared.revision.revision,
    parentVariantId,
    pricingMode: prepared.source.pricingMode,
    currencyCode: prepared.source.currencyCode,
    fixedPrice: prepared.source.fixedPrice,
    parentPrice,
  };
}

type ProjectedPublication = ReturnType<typeof projectPublication>;

function requiredParentProduct(prepared: PreparedPublication): ParentProductIds {
  const productId = prepared.bundle.parentProductGid;
  const variantId = prepared.bundle.parentVariantGid;
  if (!productId || !variantId) throw new Error("Bundle parent product is missing.");
  return { productId, variantId };
}

function parentProjection(
  prepared: ProjectedPublication,
  parent: ParentProductIds,
  guard: OperationGuard,
) {
  return {
    productId: parent.productId,
    variantId: parent.variantId,
    publicationId: requiredPublication(prepared),
    publicId: prepared.bundle.publicId,
    revision: prepared.revision.revision,
    price: prepared.parentPrice,
    runtimeValue: prepared.runtimeValue,
    presentationValue: prepared.presentationValue,
    allowRevisionChange: true,
    assertOwned: guard,
  };
}

async function persistPreparedProjection(
  prepared: ProjectedPublication,
  runtime: MetafieldResult,
  presentation: MetafieldResult,
  claimVersion: number,
): Promise<void> {
  await saveProjection({
    bundleId: prepared.bundle.id, revision: prepared.revision.revision,
    parentPrice: prepared.parentPrice,
    selectors: prepared.selectors,
    runtimeConfig: jsonValue(prepared.runtime), presentationConfig: jsonValue(prepared.presentation),
    runtimeBytes: Buffer.byteLength(prepared.runtimeValue), runtimeHash: projectionHash(prepared.runtimeValue),
    presentationHash: projectionHash(prepared.presentationValue), runtimeMetafieldId: runtime.id,
    runtimeDigest: runtime.compareDigest, presentationMetafieldId: presentation.id,
    presentationDigest: presentation.compareDigest,
  }, claimVersion);
}

interface MetafieldResult { id: string; compareDigest: string }

function requiredPublication(prepared: PublicationDetails): string {
  const id = prepared.bundle.shop.onlineStorePublicationGid;
  if (!id) throw new Error("Online Store publication is not configured.");
  return id;
}

interface PublicationDetails {
  bundle: { shop: { onlineStorePublicationGid: string | null } };
}

export function assertPublicationReady(prepared: PreparedPublication): void {
  const { shop } = prepared.bundle;
  if (!shop.eligibleForBundles) {
    throw new Error(shop.ineligibilityReason || "This shop is not eligible for bundles.");
  }
  if (!shop.cartTransformGid) throw new Error("Cart Transform is not installed.");
  if (!shop.onlineStorePublicationGid) throw new Error("Online Store publication is unavailable.");
}

function assertShop(actual: string, expected: string): void {
  if (actual !== expected) throw new Response("Bundle not found", { status: 404 });
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
