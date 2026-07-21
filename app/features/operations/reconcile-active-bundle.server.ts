import { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import type { AdminClient } from "../shopify/admin-api.server";
import {
  buildPresentationConfig,
  buildRuntimeConfig,
  jsonProjection,
  projectionHash,
} from "../bundles/bundle-config.server";
import type { BundleSelectorInput } from "../bundles/bundle.types";
import {
  verifyBundleSelectors,
} from "../bundles/variant-validation.server";
import { BundleComponentValidationError } from "../bundles/bundle-component-validation-error";
import { loadActiveBundle } from "./active-bundle.server";
import type { ActiveBundle } from "./active-bundle.server";
import { disableActiveBundle } from "./disable-active-bundle.server";
import {
  PARENT_MISSING,
  PARENT_IDENTITY_INVALID,
  PARENT_VARIANTS_INVALID,
  REVISION_CHANGED,
  repairParentProjection,
} from "./parent-projection.server";
import type {
  ParentProjectionInput,
  ProjectionFields,
} from "./parent-projection.server";
import type { OperationGuard } from "./operation-claim-guard.server";
import {
  clearMissingParentIdentity,
  persistReconciled,
  persistVerifiedSnapshot,
} from "./reconcile-state.server";

const PUBLICATION_MISSING = "ONLINE_STORE_PUBLICATION_MISSING";

export type ReconcileResult = "SYNCED" | "SOLD_OUT" | "DISABLED" | "SKIPPED";

type SelectorValidation =
  | { selectors: BundleSelectorInput[] }
  | { result: "SOLD_OUT" | "DISABLED" };

export async function reconcileActiveBundle(
  admin: AdminClient, bundleId: string, claimVersion: number,
  guard: OperationGuard,
): Promise<ReconcileResult> {
  await guard();
  const active = await loadActiveBundle(bundleId);
  if (!active?.bundle.countsTowardQuota) return "SKIPPED";
  if (active.bundle.status !== "UPDATING" || active.bundle.lockVersion !== claimVersion) return "SKIPPED";
  const validation = await validateSelectors(admin, active, guard);
  if ("result" in validation) return validation.result;
  try {
    await syncActiveBundle(admin, active, validation.selectors, guard);
    return "SYNCED";
  } catch (error) {
    if (!isUnsafeProjection(active, error)) throw error;
    await disableInvalid(admin, active, error, guard);
    return "DISABLED";
  }
}

async function validateSelectors(
  admin: AdminClient,
  active: ActiveBundle,
  guard: OperationGuard,
): Promise<SelectorValidation> {
  try {
    const publicationId = requiredPublication(active);
    const selectors = await verifyBundleSelectors(admin, active.selectors, publicationId);
    return { selectors };
  } catch (error) {
    if (!(error instanceof BundleComponentValidationError)) throw error;
    if (error.code === "SOLD_OUT") return soldOut(admin, active, error, guard);
    await disableInvalid(admin, active, error, guard);
    return { result: "DISABLED" };
  }
}

async function soldOut(
  admin: AdminClient,
  active: ActiveBundle,
  error: BundleComponentValidationError,
  guard: OperationGuard,
): Promise<SelectorValidation> {
  if (!error.selectors) throw new Error("Sold-out selector snapshot is missing.");
  await guard();
  await persistVerifiedSnapshot(
    active.bundle.id,
    active.revision.revision,
    active.bundle.lockVersion,
    error.selectors,
  );
  await disableActiveBundle(admin, active, { status: "SOLD_OUT" }, guard);
  return { result: "SOLD_OUT" };
}

async function syncActiveBundle(
  admin: AdminClient,
  active: ActiveBundle,
  selectors: BundleSelectorInput[],
  guard: OperationGuard,
): Promise<void> {
  const projection = buildProjection(active, selectors);
  await assertRevisionWritable(active);
  const input = parentInput(active, projection, guard);
  const fields = await repairParentProjection(admin, input);
  await guard();
  await persistReconciled(reconciledState(active, selectors, projection, fields));
}

function buildProjection(active: ActiveBundle, selectors: BundleSelectorInput[]) {
  const variantId = requiredVariant(active);
  const runtime = buildRuntimeConfig(active.bundle.publicId, active.revision.revision, variantId, selectors);
  const presentation = buildPresentationConfig(active.bundle.publicId, active.revision.revision, variantId, selectors);
  const runtimeValue = jsonProjection(runtime);
  const presentationValue = jsonProjection(presentation);
  return { runtime, presentation, runtimeValue, presentationValue };
}

function parentInput(
  active: ActiveBundle,
  projection: ReturnType<typeof buildProjection>,
  guard: OperationGuard,
): ParentProjectionInput {
  return {
    productId: requiredProduct(active),
    variantId: requiredVariant(active),
    publicationId: requiredPublication(active),
    publicId: active.bundle.publicId,
    revision: active.revision.revision,
    price: active.source.price,
    runtimeValue: projection.runtimeValue,
    presentationValue: projection.presentationValue,
    assertOwned: guard,
  };
}

function reconciledState(
  active: ActiveBundle, selectors: BundleSelectorInput[],
  projection: ReturnType<typeof buildProjection>,
  fields: ProjectionFields,
) {
  return {
    bundleId: active.bundle.id, revision: active.revision.revision,
    runtime: jsonValue(projection.runtime),
    presentation: jsonValue(projection.presentation),
    runtimeBytes: Buffer.byteLength(projection.runtimeValue),
    runtimeHash: projectionHash(projection.runtimeValue),
    presentationHash: projectionHash(projection.presentationValue),
    runtimeMetafieldId: fields.runtime.id,
    runtimeDigest: fields.runtime.compareDigest,
    presentationMetafieldId: fields.presentation.id,
    presentationDigest: fields.presentation.compareDigest,
    selectors,
    lockVersion: active.bundle.lockVersion,
  };
}

async function assertRevisionWritable(active: ActiveBundle): Promise<void> {
  const current = await prisma.bundle.count({
    where: {
      id: active.bundle.id,
      activeRevision: active.revision.revision,
      countsTowardQuota: true,
      status: "UPDATING",
      lockVersion: active.bundle.lockVersion,
    },
  });
  if (!current) throw new Error(REVISION_CHANGED);
}

async function disableInvalid(
  admin: AdminClient,
  active: ActiveBundle,
  error: unknown,
  guard: OperationGuard,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Bundle projection is invalid.";
  await disableActiveBundle(admin, active, {
    status: "NEEDS_ATTENTION",
    code: errorCode(error),
    message,
  }, guard);
  if (error instanceof Error && error.message === PARENT_VARIANTS_INVALID) {
    await clearInvalidVariantIdentity(active);
  }
}

function clearInvalidVariantIdentity(active: ActiveBundle): Promise<void> {
  return clearMissingParentIdentity({
    bundleId: active.bundle.id,
    productId: active.bundle.parentProductGid,
    variantId: active.bundle.parentVariantGid,
    lockVersion: active.bundle.lockVersion + 1,
  });
}

function errorCode(error: unknown): string {
  if (error instanceof BundleComponentValidationError) return "COMPONENT_INVALID";
  if (error instanceof Error && error.message === PARENT_MISSING) return PARENT_MISSING;
  if (error instanceof Error && error.message === PARENT_IDENTITY_INVALID) return PARENT_IDENTITY_INVALID;
  if (error instanceof Error && error.message === PARENT_VARIANTS_INVALID) return PARENT_VARIANTS_INVALID;
  if (error instanceof Error && error.message === PUBLICATION_MISSING) return PUBLICATION_MISSING;
  return "SHOPIFY_DRIFT";
}

function requiredProduct(active: ActiveBundle): string {
  if (!active.bundle.parentProductGid) throw new Error(PARENT_MISSING);
  return active.bundle.parentProductGid;
}

function requiredVariant(active: ActiveBundle): string {
  if (!active.bundle.parentVariantGid) throw new Error(PARENT_MISSING);
  return active.bundle.parentVariantGid;
}

function requiredPublication(active: ActiveBundle): string {
  const id = active.bundle.shop.onlineStorePublicationGid;
  if (!id) throw new Error(PUBLICATION_MISSING);
  return id;
}

function isUnsafeProjection(active: ActiveBundle, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message === REVISION_CHANGED) return true;
  return [PARENT_MISSING, PARENT_IDENTITY_INVALID, PARENT_VARIANTS_INVALID, PUBLICATION_MISSING]
    .includes(error.message);
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
