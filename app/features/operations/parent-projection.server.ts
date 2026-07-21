import { Prisma } from "@prisma/client";
import type { AdminClient } from "../shopify/admin-api.server";
import {
  publishProduct,
  setProductStatus,
  unpublishProduct,
  updateParentVariant,
  writeProductMetafields,
} from "../bundles/shopify-product.server";
import type { MetafieldWrite } from "../bundles/shopify-product.server";
import { guardAdminClient } from "./operation-claim-guard.server";
import { readParentState } from "./parent-state.server";
import type { MetafieldState, ParentState } from "./parent-state.server";

export const PARENT_MISSING = "PARENT_PRODUCT_MISSING";
export const PARENT_IDENTITY_INVALID = "PARENT_IDENTITY_INVALID";
export const PARENT_VARIANTS_INVALID = "PARENT_VARIANTS_INVALID";
export const REVISION_CHANGED = "ACTIVE_REVISION_CHANGED";

export interface ParentProjectionInput {
  productId: string;
  variantId: string;
  publicationId: string;
  publicId: string;
  revision: number;
  price: string;
  runtimeValue: string;
  presentationValue: string;
  allowRevisionChange?: boolean;
  assertOwned: () => Promise<void>;
}

export interface ProjectionFields {
  runtime: MetafieldState;
  presentation: MetafieldState;
}

export async function repairParentProjection(
  admin: AdminClient,
  input: ParentProjectionInput,
): Promise<ProjectionFields> {
  const guardedAdmin = guardAdminClient(admin, input.assertOwned);
  const before = await managedParent(guardedAdmin, input);
  const changing = projectionChanged(before, input);
  const closed = changing ? await closeForProjectionChange(guardedAdmin, input, before) : before;
  if (changing) await applyProjection(guardedAdmin, input, closed);
  const staged = changing ? await managedParent(guardedAdmin, input) : closed;
  assertProjection(staged, input);
  await enableProjection(guardedAdmin, input, staged);
  const after = await managedParent(guardedAdmin, input);
  assertParentProjection(after, input);
  return projectionFields(after);
}

async function closeForProjectionChange(
  admin: AdminClient,
  input: ParentProjectionInput,
  state: ParentState,
): Promise<ParentState> {
  const disabledValue = await gateRuntime(admin, input, state);
  if (state.status !== "DRAFT") {
    await input.assertOwned();
    await setProductStatus(admin, productStatus(input, "DRAFT"));
  }
  if (state.publishedOnPublication) {
    await input.assertOwned();
    await unpublishProduct(admin, input.productId, input.publicationId);
  }
  const closed = await managedParent(admin, input);
  if (disabledValue) assertClosed(closed, disabledValue);
  else assertClosedState(closed);
  return closed;
}

async function gateRuntime(
  admin: AdminClient,
  input: ParentProjectionInput,
  state: ParentState,
): Promise<string | undefined> {
  if (!potentiallySellable(state)) return undefined;
  const value = disabledRuntimeValue(input.runtimeValue);
  await writeRuntime(admin, input, value, state.runtime);
  return value;
}

function potentiallySellable(state: ParentState): boolean {
  return state.status === "ACTIVE" || state.publishedOnPublication;
}

async function writeRuntime(
  admin: AdminClient,
  input: ParentProjectionInput,
  value: string,
  current?: MetafieldState | null,
): Promise<void> {
  if (current?.value === value) return;
  await input.assertOwned();
  const fields = await writeProductMetafields(admin, input.productId, [
    fieldWrite("bundle_runtime", value, current),
  ]);
  const runtime = fields.find(({ key }) => key === "bundle_runtime");
  if (!runtime || runtime.value !== value) throw new Error("Parent runtime gate failed.");
}

function disabledRuntimeValue(value: string): string {
  let runtime: unknown;
  try { runtime = JSON.parse(value); }
  catch { throw new Error("Desired parent runtime is invalid."); }
  if (!isRecord(runtime)) throw new Error("Desired parent runtime is invalid.");
  return JSON.stringify({ ...runtime, en: 0 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function applyProjection(
  admin: AdminClient,
  input: ParentProjectionInput,
  state: ParentState,
): Promise<void> {
  assertClosedState(state);
  await repairVariant(admin, input, state);
  await repairDraftLifecycle(admin, input, state);
  await syncMetafields(admin, input, state);
}

async function repairVariant(
  admin: AdminClient,
  input: ParentProjectionInput,
  state: ParentState,
): Promise<void> {
  const variant = state.variants.nodes[0];
  if (variant.requiresComponents && sameMoney(variant.price, input.price)) return;
  await input.assertOwned();
  await updateParentVariant(admin, parentVariant(input));
}

async function repairDraftLifecycle(
  admin: AdminClient,
  input: ParentProjectionInput,
  state: ParentState,
): Promise<void> {
  if (state.status === "DRAFT") return;
  await input.assertOwned();
  await setProductStatus(admin, productStatus(input, "DRAFT"));
}

async function syncMetafields(
  admin: AdminClient,
  input: ParentProjectionInput,
  state: ParentState,
): Promise<void> {
  const writes = changedWrites(input, state);
  if (!writes.length) return;
  await input.assertOwned();
  await writeProductMetafields(admin, input.productId, writes);
}

function changedWrites(input: ParentProjectionInput, state: ParentState): MetafieldWrite[] {
  const writes: MetafieldWrite[] = [];
  if (state.runtime?.value !== input.runtimeValue) {
    writes.push(fieldWrite("bundle_runtime", input.runtimeValue, state.runtime));
  }
  if (state.presentation?.value !== input.presentationValue) {
    writes.push(fieldWrite("bundle_presentation", input.presentationValue, state.presentation));
  }
  return writes;
}

function fieldWrite(
  key: MetafieldWrite["key"],
  value: string,
  current?: MetafieldState | null,
): MetafieldWrite {
  return { key, value, compareDigest: current?.compareDigest ?? null };
}

async function enableProjection(
  admin: AdminClient,
  input: ParentProjectionInput,
  state: ParentState,
): Promise<void> {
  if (state.status !== "ACTIVE") {
    await input.assertOwned();
    await setProductStatus(admin, productStatus(input, "ACTIVE"));
  }
  if (!state.publishedOnPublication) {
    await input.assertOwned();
    await publishProduct(admin, input.productId, input.publicationId);
  }
}

function productStatus(input: ParentProjectionInput, status: "ACTIVE" | "DRAFT") {
  return { id: input.productId, status };
}

function parentVariant(input: ParentProjectionInput) {
  return { productId: input.productId, variantId: input.variantId, price: input.price };
}

function projectionChanged(state: ParentState, input: ParentProjectionInput): boolean {
  const variant = state.variants.nodes[0];
  return !variant.requiresComponents || !sameMoney(variant.price, input.price) ||
    state.runtime?.value !== input.runtimeValue ||
    state.presentation?.value !== input.presentationValue;
}

function assertClosed(state: ParentState, runtimeValue: string): void {
  assertClosedState(state);
  if (state.runtime?.value !== runtimeValue) throw new Error("Parent runtime gate verification failed.");
}

function assertClosedState(state: ParentState): void {
  if (state.status !== "DRAFT" || state.publishedOnPublication) {
    throw new Error("Parent product could not be made fail-closed.");
  }
}

function assertProjection(state: ParentState, input: ParentProjectionInput): void {
  const variant = state.variants.nodes[0];
  assertIdentity(state, input.publicId);
  assertManagedVariant(state, input.variantId);
  if (!variant.requiresComponents || !sameMoney(variant.price, input.price)) {
    throw new Error("Parent variant repair failed.");
  }
  if (state.runtime?.value !== input.runtimeValue) throw new Error("Parent runtime repair failed.");
  if (state.presentation?.value !== input.presentationValue) throw new Error("Parent presentation repair failed.");
}

function assertParentProjection(state: ParentState, input: ParentProjectionInput): void {
  assertProjection(state, input);
  if (state.status !== "ACTIVE" || !state.publishedOnPublication) {
    throw new Error("Parent is not published.");
  }
}

function projectionFields(state: ParentState): ProjectionFields {
  if (!state.runtime || !state.presentation) throw new Error("Parent projection is incomplete.");
  return { runtime: state.runtime, presentation: state.presentation };
}

async function managedParent(admin: AdminClient, input: ParentProjectionInput): Promise<ParentState> {
  const state = await readParentState(admin, input.productId, input.publicationId);
  if (!state) throw new Error(PARENT_MISSING);
  assertIdentity(state, input.publicId);
  assertManagedVariant(state, input.variantId);
  assertRuntimeOwner(state.runtime, input);
  return state;
}

function assertManagedVariant(state: ParentState, variantId: string): void {
  if (state.variants.nodes.length !== 1 || state.variants.nodes[0].id !== variantId) {
    throw new Error(PARENT_VARIANTS_INVALID);
  }
}

function assertIdentity(state: ParentState, publicId: string): void {
  if (state.identity?.value !== publicId) throw new Error(PARENT_IDENTITY_INVALID);
}

function assertRuntimeOwner(
  field: MetafieldState | null | undefined,
  input: ParentProjectionInput,
): void {
  if (!field) return;
  const runtime = parseRuntime(field.value);
  if (!runtime) return;
  const revisionConflict = runtime.rv !== input.revision && !input.allowRevisionChange;
  if (revisionConflict || runtime.b !== input.publicId) throw new Error(REVISION_CHANGED);
}

function parseRuntime(value: string): { rv?: number; b?: string } | null {
  try { return JSON.parse(value) as { rv?: number; b?: string }; }
  catch { return null; }
}

function sameMoney(actual: string, expected: string): boolean {
  try { return new Prisma.Decimal(actual).equals(new Prisma.Decimal(expected)); }
  catch { return false; }
}
