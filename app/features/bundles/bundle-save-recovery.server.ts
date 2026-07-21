import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import { adminRequest, type AdminClient } from "../shopify/admin-api.server";
import { READ_PRODUCT_CONTENT } from "./bundle-graphql.server";
import { contentFieldHash } from "./content/content-hash.server";
import { clearedBundleSaveClaim } from "./bundle-save-claim.server";

const CLAIM_IDLE_MS = 10 * 60_000;
const OBSERVATION_QUIET_MS = 2 * 60_000;

const recoverySelect = {
  id: true, publicId: true, parentProductGid: true, editorSaveToken: true,
  editorSaveStartedAt: true, editorSaveState: true, editorSaveSettleAt: true,
  editorSaveObservedHash: true, editorSaveObservedAt: true,
} satisfies Prisma.BundleSelect;

type RecoveryRecord = Prisma.BundleGetPayload<{ select: typeof recoverySelect }>;
export type BundleSaveRecovery = "READY" | "WAITING" | "RECOVERED" | "NOTICE";

export async function recoverBundleSaveClaim(
  admin: AdminClient,
  shopId: string,
  bundleId: string,
): Promise<BundleSaveRecovery> {
  const claim = await recoveryRecord(shopId, bundleId);
  if (!claim?.editorSaveToken) return claim?.editorSaveState === "RECOVERED" ? "NOTICE" : "READY";
  if (claim.editorSaveState === "CLAIMED") return recoverClaimed(shopId, claim);
  if (!recoveryDue(claim)) return "WAITING";
  return observeSafely(admin, shopId, claim);
}

async function observeSafely(admin: AdminClient, shopId: string, claim: RecoveryRecord) {
  try {
    return await observeRemoteSave(admin, shopId, claim);
  } catch {
    return "WAITING" as const;
  }
}

function recoveryRecord(shopId: string, bundleId: string) {
  return prisma.bundle.findFirst({ where: { id: bundleId, shopId }, select: recoverySelect });
}

async function recoverClaimed(shopId: string, claim: RecoveryRecord): Promise<BundleSaveRecovery> {
  if (!claim.editorSaveStartedAt || !olderThan(claim.editorSaveStartedAt, CLAIM_IDLE_MS)) return "WAITING";
  const recovered = await prisma.bundle.updateMany({
    where: { ...claimWhere(shopId, claim), editorSaveState: "CLAIMED" },
    data: recoveredBundleData(),
  });
  return recovered.count === 1 ? "RECOVERED" : "WAITING";
}

function recoveryDue(claim: RecoveryRecord): boolean {
  return Boolean(claim.editorSaveSettleAt && claim.editorSaveSettleAt.getTime() <= Date.now()
    && claim.parentProductGid && claim.editorSaveState);
}

async function observeRemoteSave(
  admin: AdminClient,
  shopId: string,
  claim: RecoveryRecord,
): Promise<BundleSaveRecovery> {
  const observed = await productObservation(admin, claim.parentProductGid!, claim.publicId);
  if (!stableObservation(claim, observed)) return recordObservation(shopId, claim, observed);
  if (!olderThan(claim.editorSaveObservedAt!, OBSERVATION_QUIET_MS)) return "WAITING";
  return finishRecovery(shopId, claim, observed);
}

function stableObservation(claim: RecoveryRecord, observed: string): boolean {
  return claim.editorSaveState === "VERIFYING"
    && claim.editorSaveObservedHash === observed && Boolean(claim.editorSaveObservedAt);
}

async function recordObservation(
  shopId: string,
  claim: RecoveryRecord,
  observed: string,
): Promise<BundleSaveRecovery> {
  await prisma.bundle.updateMany({
    where: { ...claimWhere(shopId, claim), editorSaveState: claim.editorSaveState! },
    data: { editorSaveState: "VERIFYING", editorSaveObservedHash: observed, editorSaveObservedAt: new Date() },
  });
  return "WAITING";
}

async function finishRecovery(
  shopId: string,
  claim: RecoveryRecord,
  observed: string,
): Promise<BundleSaveRecovery> {
  const recovered = await prisma.bundle.updateMany({
    where: {
      ...claimWhere(shopId, claim), editorSaveState: "VERIFYING",
      editorSaveObservedHash: observed, editorSaveObservedAt: claim.editorSaveObservedAt,
    },
    data: recoveredBundleData(),
  });
  return recovered.count === 1 ? "RECOVERED" : "WAITING";
}

function recoveredBundleData(): Prisma.BundleUpdateInput {
  return {
    ...clearedBundleSaveClaim(), lockVersion: { increment: 1 },
    editorSaveState: "RECOVERED",
    lastErrorCode: "EDITOR_SAVE_RECOVERED",
    lastErrorMessage: "A previous Shopify content save ended unexpectedly. Review the content and save again.",
  };
}

function claimWhere(shopId: string, claim: RecoveryRecord) {
  return { id: claim.id, shopId, editorSaveToken: claim.editorSaveToken! };
}

function olderThan(value: Date, milliseconds: number): boolean {
  return value.getTime() + milliseconds <= Date.now();
}

function contentFingerprint(title: string, descriptionHtml: string): string {
  return contentFieldHash(`${contentFieldHash(title)}.${contentFieldHash(descriptionHtml)}`);
}

async function productObservation(admin: AdminClient, productId: string, publicId: string) {
  const result = await adminRequest<{ product?: ObservationProduct | null }>(
    admin, READ_PRODUCT_CONTENT, { id: productId },
  );
  if (!result.product) return contentFieldHash("missing-product");
  if (result.product.identity?.value !== publicId) {
    const identity = contentFieldHash(result.product.identity?.value ?? "");
    const content = contentFingerprint(result.product.title, result.product.descriptionHtml);
    return contentFieldHash(`foreign-product.${identity}.${content}`);
  }
  return contentFingerprint(result.product.title, result.product.descriptionHtml);
}

interface ObservationProduct {
  title: string;
  descriptionHtml: string;
  identity?: { value: string } | null;
}
