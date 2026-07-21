import { BundleStatus } from "@prisma/client";
import prisma from "../../db.server";
import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest, assertNoUserErrors } from "../shopify/admin-api.server";
import {
  buildRuntimeConfig,
  disabledRuntime,
  jsonProjection,
} from "../bundles/bundle-config.server";
import {
  readProductState,
  unpublishProduct,
  writeProductMetafields,
} from "../bundles/shopify-product.server";
import type { ActiveBundle } from "./active-bundle.server";
import {
  createBundleClaimGuard,
  guardAdminClient,
} from "./operation-claim-guard.server";
import type { OperationGuard } from "./operation-claim-guard.server";
import {
  clearMissingParentIdentity,
  persistDisabled,
} from "./reconcile-state.server";

export type DisableReason =
  | { status: "PAUSED" }
  | { status: "SOLD_OUT" }
  | { status: "NEEDS_ATTENTION"; code: string; message: string };

export async function disableActiveBundle(
  admin: AdminClient,
  active: ActiveBundle,
  reason: DisableReason,
  providedGuard?: OperationGuard,
): Promise<void> {
  const guard = providedGuard ?? disableGuard(active);
  const guardedAdmin = guardAdminClient(admin, guard);
  await guard();
  await markReasonAttention(active, reason);
  const productId = active.bundle.parentProductGid;
  const publicationId = active.bundle.shop.onlineStorePublicationGid;
  if (!productId) return persistMissingParent(active, reason, guard);
  const runtimeValue = disabledRuntimeValue(active);
  if (!publicationId) return disableWithoutPublication(guardedAdmin, active, reason, runtimeValue, guard);
  return disablePublishedProduct(guardedAdmin, active, reason, runtimeValue, guard);
}

function disableGuard(active: ActiveBundle): OperationGuard {
  return createBundleClaimGuard({
    bundleId: active.bundle.id,
    lockVersion: active.bundle.lockVersion,
    statuses: [active.bundle.status as BundleStatus],
  });
}

async function disablePublishedProduct(
  admin: AdminClient,
  active: ActiveBundle,
  reason: DisableReason,
  runtimeValue: string,
  guard: OperationGuard,
): Promise<void> {
  const publicationId = active.bundle.shop.onlineStorePublicationGid!;
  const state = await readStateOrPersistMissing(admin, active, reason, publicationId, guard);
  if (!state) return;
  const productId = active.bundle.parentProductGid!;
  const runtime = await guarded(guard, () => ensureDisabledRuntime(admin, productId, runtimeValue, state.runtime));
  if (state.status !== "DRAFT") await guarded(guard, () => setProductDraft(admin, productId));
  if (state.publishedOnPublication) await guarded(guard, () => unpublishProduct(admin, productId, publicationId));
  await verifyDisabled(admin, active, runtimeValue);
  await guarded(guard, () => persistDisabled(disabledState(active, reason, runtime.compareDigest)));
}

async function markReasonAttention(active: ActiveBundle, reason: DisableReason): Promise<void> {
  if (reason.status !== "NEEDS_ATTENTION") return;
  await prisma.bundle.updateMany({
    where: { id: active.bundle.id, lockVersion: active.bundle.lockVersion },
    data: {
      health: "NEEDS_ATTENTION",
      lastErrorCode: reason.code,
      lastErrorMessage: reason.message.slice(0, 1_000),
    },
  });
}

async function disableWithoutPublication(
  admin: AdminClient,
  active: ActiveBundle,
  reason: DisableReason,
  runtimeValue: string,
  guard: OperationGuard,
): Promise<void> {
  const productId = active.bundle.parentProductGid!;
  const before = await readBaseState(admin, productId);
  if (!before) return persistMissingParent(active, reason, guard);
  const runtime = await guarded(guard, () => ensureDisabledRuntime(admin, productId, runtimeValue, before.runtime));
  if (before.status !== "DRAFT") await guarded(guard, () => setProductDraft(admin, productId));
  const after = await readBaseState(admin, productId);
  if (!after) return persistMissingParent(active, reason, guard);
  assertBaseDisabled(after, runtimeValue);
  await guarded(guard, () => persistDisabled(disabledState(active, reason, runtime.compareDigest)));
}

function disabledRuntimeValue(active: ActiveBundle): string {
  const enabled = buildRuntimeConfig(
    active.bundle.publicId,
    active.revision.revision,
    requiredVariant(active),
    active.selectors,
  );
  return jsonProjection(disabledRuntime(enabled));
}

function requiredVariant(active: ActiveBundle): string {
  if (!active.bundle.parentVariantGid) throw new Error("Bundle parent variant is missing.");
  return active.bundle.parentVariantGid;
}

async function readStateOrPersistMissing(
  admin: AdminClient,
  active: ActiveBundle,
  reason: DisableReason,
  publicationId: string,
  guard: OperationGuard,
) {
  try {
    return await readProductState(admin, active.bundle.parentProductGid!, publicationId);
  } catch (error) {
    if (!isMissingParent(error)) throw error;
    await persistMissingParent(active, missingReason(reason), guard);
    return null;
  }
}

async function ensureDisabledRuntime(
  admin: AdminClient,
  productId: string,
  value: string,
  current?: { id: string; value: string; compareDigest: string } | null,
) {
  if (current?.value === value) return current;
  const [runtime] = await writeProductMetafields(admin, productId, [
    { key: "bundle_runtime", value, compareDigest: current?.compareDigest ?? null },
  ]);
  if (!runtime) throw new Error("Shopify did not disable bundle runtime.");
  return runtime;
}

async function verifyDisabled(
  admin: AdminClient,
  active: ActiveBundle,
  runtimeValue: string,
): Promise<void> {
  const state = await readProductState(
    admin,
    active.bundle.parentProductGid!,
    active.bundle.shop.onlineStorePublicationGid!,
  );
  assertDisabled(state, runtimeValue);
}

function assertDisabled(
  state: { status: string; publishedOnPublication: boolean; runtime?: { value: string } | null },
  runtimeValue: string,
): void {
  if (state.status !== "DRAFT" || state.publishedOnPublication) {
    throw new Error("Bundle product is still published.");
  }
  if (state.runtime?.value !== runtimeValue) throw new Error("Bundle runtime is still enabled.");
}

function assertBaseDisabled(state: BaseProductState, runtimeValue: string): void {
  if (state.status !== "DRAFT") throw new Error("Bundle product is still active.");
  if (state.runtime?.value !== runtimeValue) throw new Error("Bundle runtime is still enabled.");
}

async function persistMissingParent(
  active: ActiveBundle,
  reason: DisableReason,
  guard: OperationGuard,
): Promise<void> {
  await guarded(guard, () => clearMissingParentIdentity({
    bundleId: active.bundle.id,
    productId: active.bundle.parentProductGid,
    variantId: active.bundle.parentVariantGid,
    lockVersion: active.bundle.lockVersion,
  }));
  await guarded(guard, () => persistDisabled(disabledState(active, missingReason(reason))));
}

async function guarded<T>(guard: OperationGuard, action: () => Promise<T>): Promise<T> {
  await guard();
  return action();
}

function missingReason(reason: DisableReason): DisableReason {
  if (reason.status === "PAUSED") return reason;
  if (reason.status === "SOLD_OUT") {
    return { status: "NEEDS_ATTENTION", code: "PARENT_PRODUCT_MISSING", message: "Parent product is missing." };
  }
  return { ...reason, code: "PARENT_PRODUCT_MISSING" };
}

function disabledState(active: ActiveBundle, reason: DisableReason, runtimeDigest?: string) {
  return {
    bundleId: active.bundle.id,
    revision: active.revision.revision,
    lockVersion: active.bundle.lockVersion,
    revisionSource: active.revisionSource,
    runtimeDigest,
    status: reason.status,
    errorCode: reason.status === "NEEDS_ATTENTION" ? reason.code : undefined,
    errorMessage: reason.status === "NEEDS_ATTENTION" ? reason.message : undefined,
  };
}

const SET_PRODUCT_DRAFT = `#graphql
  mutation SmartBundleMaintenanceDraft($product: ProductUpdateInput!) {
    productUpdate(product: $product) { userErrors { message } }
  }
`;

const READ_BASE_PRODUCT = `#graphql
  query SmartBundleMaintenanceRead($id: ID!) {
    product(id: $id) {
      status
      runtime: metafield(namespace: "$app", key: "bundle_runtime") {
        id value compareDigest
      }
    }
  }
`;

interface BaseProductState {
  status: string;
  runtime?: { id: string; value: string; compareDigest: string } | null;
}

async function readBaseState(admin: AdminClient, productId: string): Promise<BaseProductState | null> {
  const result = await adminRequest<{ product?: BaseProductState | null }>(
    admin,
    READ_BASE_PRODUCT,
    { id: productId },
  );
  return result.product ?? null;
}

async function setProductDraft(admin: AdminClient, productId: string): Promise<void> {
  const result = await adminRequest<ProductUpdateResult>(admin, SET_PRODUCT_DRAFT, {
    product: { id: productId, status: "DRAFT" },
  });
  assertNoUserErrors(result.productUpdate.userErrors, "Bundle product pause failed");
}

interface ProductUpdateResult {
  productUpdate: { userErrors: Array<{ message: string }> };
}

function isMissingParent(error: unknown): boolean {
  return error instanceof Error && error.message === "Bundle product no longer exists.";
}
