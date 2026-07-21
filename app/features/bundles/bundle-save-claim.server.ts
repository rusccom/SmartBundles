import { randomUUID } from "node:crypto";
import { BundleStatus, type Prisma } from "@prisma/client";
import prisma from "../../db.server";
import { BundleVersionConflictError } from "./BundleVersionConflictError.server";
import { serializable } from "./bundle-quota.server";

const REMOTE_SETTLE_MS = 10 * 60_000;
const BUSY_STATUSES: BundleStatus[] = [
  BundleStatus.PUBLISHING,
  BundleStatus.UPDATING,
  BundleStatus.PAUSING,
];

const claimSelect = {
  id: true,
  publicId: true,
  parentProductGid: true,
  parentVariantGid: true,
  status: true,
  lockVersion: true,
  editorSaveToken: true,
  editorSaveState: true,
} satisfies Prisma.BundleSelect;

type ClaimRecord = Prisma.BundleGetPayload<{ select: typeof claimSelect }>;

export interface BundleSaveClaim {
  token: string;
  shopId: string;
  id: string;
  publicId: string;
  productId: string;
  variantId: string;
  status: BundleStatus;
  lockVersion: number;
  hadRecoveryNotice: boolean;
}

export function claimBundleSave(
  shopId: string,
  bundleId: string,
  expectedVersion: number,
): Promise<BundleSaveClaim> {
  const token = randomUUID();
  return serializable((tx) => claimInTransaction(tx, shopId, bundleId, expectedVersion, token));
}

async function claimInTransaction(
  tx: Prisma.TransactionClient,
  shopId: string,
  bundleId: string,
  expectedVersion: number,
  token: string,
): Promise<BundleSaveClaim> {
  const bundle = await tx.bundle.findFirst({ where: { id: bundleId, shopId }, select: claimSelect });
  assertClaimable(bundle, expectedVersion);
  const claimed = await tx.bundle.updateMany({
    where: claimableWhere(shopId, bundle!, expectedVersion),
    data: {
      editorSaveToken: token, editorSaveStartedAt: new Date(), editorSaveState: "CLAIMED",
      editorSaveSettleAt: null, editorSaveObservedHash: null, editorSaveObservedAt: null,
    },
  });
  if (claimed.count !== 1) throw new BundleVersionConflictError();
  return toSaveClaim(shopId, bundle!, token);
}

function assertClaimable(bundle: ClaimRecord | null, expectedVersion: number): void {
  if (!bundle) throw new Response("Bundle not found", { status: 404 });
  const blocked = bundle.lockVersion !== expectedVersion || bundle.editorSaveToken
    || BUSY_STATUSES.includes(bundle.status);
  if (blocked) throw new BundleVersionConflictError();
  if (!bundle.parentProductGid || !bundle.parentVariantGid) {
    throw new Error("Bundle parent product is missing.");
  }
}

function claimableWhere(shopId: string, bundle: ClaimRecord, expectedVersion: number) {
  return {
    id: bundle.id, shopId, status: bundle.status, lockVersion: expectedVersion,
    editorSaveToken: null, parentProductGid: { not: null }, parentVariantGid: { not: null },
  };
}

function toSaveClaim(shopId: string, bundle: ClaimRecord, token: string): BundleSaveClaim {
  return {
    token, shopId, id: bundle.id, publicId: bundle.publicId,
    productId: bundle.parentProductGid!, variantId: bundle.parentVariantGid!,
    status: bundle.status, lockVersion: bundle.lockVersion,
    hadRecoveryNotice: bundle.editorSaveState === "RECOVERED",
  };
}

export async function assertBundleSaveClaim(claim: BundleSaveClaim): Promise<void> {
  const count = await prisma.bundle.count({ where: bundleSaveClaimWhere(claim) });
  if (count !== 1) throw new BundleVersionConflictError();
}

export async function markBundleSaveApplying(claim: BundleSaveClaim): Promise<void> {
  const updated = await prisma.bundle.updateMany({
    where: { ...bundleSaveClaimWhere(claim), editorSaveState: "CLAIMED" },
    data: {
      editorSaveState: "APPLYING",
      editorSaveSettleAt: new Date(Date.now() + REMOTE_SETTLE_MS),
    },
  });
  if (updated.count !== 1) throw new BundleVersionConflictError();
}

export async function releaseBundleSaveClaim(claim: BundleSaveClaim): Promise<void> {
  await prisma.bundle.updateMany({
    where: { id: claim.id, shopId: claim.shopId, editorSaveToken: claim.token },
    data: {
      ...clearedBundleSaveClaim(),
      editorSaveState: claim.hadRecoveryNotice ? "RECOVERED" : null,
    },
  });
}

export function clearedBundleSaveClaim(): Prisma.BundleUpdateInput {
  return {
    editorSaveToken: null, editorSaveStartedAt: null, editorSaveState: null,
    editorSaveSettleAt: null, editorSaveObservedHash: null, editorSaveObservedAt: null,
  };
}

export function bundleSaveClaimWhere(claim: BundleSaveClaim): Prisma.BundleWhereInput {
  return {
    id: claim.id, shopId: claim.shopId, status: claim.status,
    lockVersion: claim.lockVersion, editorSaveToken: claim.token,
    parentProductGid: claim.productId, parentVariantGid: claim.variantId,
  };
}
