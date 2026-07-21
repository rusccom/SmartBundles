import type { BundleHealth, Prisma } from "@prisma/client";
import prisma from "../../db.server";
import type { BundleSelectorInput } from "../bundles/bundle.types";

export interface ReconcileStateInput {
  bundleId: string;
  revision: number;
  runtime: Prisma.InputJsonValue;
  presentation: Prisma.InputJsonValue;
  runtimeBytes: number;
  runtimeHash: string;
  presentationHash: string;
  parentPrice: string;
  runtimeMetafieldId: string;
  runtimeDigest: string;
  presentationMetafieldId: string;
  presentationDigest: string;
  selectors: BundleSelectorInput[];
  lockVersion: number;
}

export async function persistReconciled(input: ReconcileStateInput): Promise<void> {
  await prisma.$transaction((tx) => persistReconciledTransaction(tx, input));
}

async function persistReconciledTransaction(
  tx: Prisma.TransactionClient,
  input: ReconcileStateInput,
): Promise<void> {
  const revision = await loadRevisionSnapshot(tx, input);
  await updateReconciledRevision(tx, input);
  await updateSelectorSnapshots(tx, revision.id, input.selectors);
  await upsertReconciledProjection(tx, input);
  const updated = await finalizeReconciledBundle(tx, input);
  if (!updated.count) throw new Error("Bundle activation changed during reconciliation.");
}

function updateReconciledRevision(
  tx: Prisma.TransactionClient,
  input: ReconcileStateInput,
) {
  return tx.bundleRevision.update({
    where: { bundleId_revision: { bundleId: input.bundleId, revision: input.revision } },
    data: revisionData(input),
    select: { id: true },
  });
}

function upsertReconciledProjection(tx: Prisma.TransactionClient, input: ReconcileStateInput) {
  return tx.shopifyProjection.upsert({
    where: { bundleId: input.bundleId },
    create: projectionCreate(input),
    update: projectionUpdate(input),
  });
}

function finalizeReconciledBundle(tx: Prisma.TransactionClient, input: ReconcileStateInput) {
  return tx.bundle.updateMany({
    where: {
      id: input.bundleId, activeRevision: input.revision,
      countsTowardQuota: true, status: "UPDATING", lockVersion: input.lockVersion,
    },
    data: healthyBundle(input.selectors),
  });
}

export async function persistVerifiedSnapshot(
  bundleId: string,
  revision: number,
  lockVersion: number,
  selectors: BundleSelectorInput[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertSnapshotClaim(tx, bundleId, revision, lockVersion);
    const current = await loadRevisionSnapshot(tx, { bundleId, revision });
    await updateSelectorSnapshots(tx, current.id, selectors);
  });
}

async function assertSnapshotClaim(
  tx: Prisma.TransactionClient,
  bundleId: string,
  revision: number,
  lockVersion: number,
): Promise<void> {
  const owned = await tx.bundle.updateMany({
    where: { id: bundleId, activeRevision: revision, status: "UPDATING", lockVersion },
    data: { lockVersion },
  });
  if (owned.count !== 1) throw new Error("Bundle activation changed while refreshing selectors.");
}

function loadRevisionSnapshot(
  tx: Prisma.TransactionClient,
  input: { bundleId: string; revision: number },
) {
  return tx.bundleRevision.findUniqueOrThrow({
    where: { bundleId_revision: { bundleId: input.bundleId, revision: input.revision } },
    select: { id: true },
  });
}

async function updateSelectorSnapshots(
  tx: Prisma.TransactionClient,
  revisionId: string,
  selectors: BundleSelectorInput[],
): Promise<void> {
  for (const selector of selectors) {
    await tx.bundleSelector.update({
      where: { revisionId_selectorKey: { revisionId, selectorKey: selector.key } },
      data: {
        productTitle: selector.productTitle,
        quantity: selector.quantity,
        options: { updateMany: selector.options.map(optionSnapshot) },
      },
    });
  }
}

function optionSnapshot(option: BundleSelectorInput["options"][number]) {
  return {
    where: { variantGid: option.id },
    data: {
      title: option.title,
      imageUrl: option.imageUrl ?? null,
      available: Boolean(option.available),
      unitPrice: option.unitPrice,
    },
  };
}

function revisionData(input: ReconcileStateInput) {
  return {
    runtimeConfig: input.runtime,
    presentationConfig: input.presentation,
    parentPrice: input.parentPrice,
    runtimeBytes: input.runtimeBytes,
    runtimeHash: input.runtimeHash,
    presentationHash: input.presentationHash,
  };
}

function projectionCreate(input: ReconcileStateInput) {
  return { bundleId: input.bundleId, ...projectionUpdate(input) };
}

function projectionUpdate(input: ReconcileStateInput) {
  return {
    runtimeMetafieldId: input.runtimeMetafieldId,
    runtimeDigest: input.runtimeDigest,
    runtimeHash: input.runtimeHash,
    presentationMetafieldId: input.presentationMetafieldId,
    presentationDigest: input.presentationDigest,
    presentationHash: input.presentationHash,
    productStatus: "ACTIVE",
    published: true,
    checkedAt: new Date(),
  };
}

function healthyBundle(selectors: BundleSelectorInput[]) {
  return {
    status: "ACTIVE" as const,
    health: bundleHealth(selectors),
    runtimeEnabled: true,
    publishedVerified: true,
    lastErrorCode: null,
    lastErrorMessage: null,
    lockVersion: { increment: 1 },
  };
}

function bundleHealth(selectors: BundleSelectorInput[]): BundleHealth {
  const unavailable = selectors.some(({ options }) => options.every(({ available }) => available === false));
  return unavailable ? "SOLD_OUT" : "READY";
}

export async function clearMissingParentIdentity(input: {
  bundleId: string;
  productId: string | null;
  variantId: string | null;
  lockVersion: number;
}): Promise<void> {
  await prisma.$transaction((tx) => clearParentTransaction(tx, input));
}

async function clearParentTransaction(
  tx: Prisma.TransactionClient,
  input: { bundleId: string; productId: string | null; variantId: string | null; lockVersion: number },
): Promise<void> {
  const cleared = await tx.bundle.updateMany({
    where: {
      id: input.bundleId, parentProductGid: input.productId,
      parentVariantGid: input.variantId, lockVersion: input.lockVersion,
    },
    data: { parentProductGid: null, parentVariantGid: null },
  });
  if (cleared.count !== 1) throw new Error("Parent identity changed while clearing it.");
  await tx.shopifyProjection.updateMany({
    where: { bundleId: input.bundleId }, data: emptyProjection(),
  });
}

function emptyProjection() {
  return {
    runtimeMetafieldId: null,
    runtimeDigest: null,
    runtimeHash: null,
    presentationMetafieldId: null,
    presentationDigest: null,
    presentationHash: null,
    productStatus: null,
    published: false,
    checkedAt: new Date(),
  };
}

export interface DisabledStateInput {
  bundleId: string;
  revision: number;
  lockVersion: number;
  revisionSource: "ACTIVE" | "DRAFT";
  runtimeDigest?: string;
  status: "PAUSED" | "SOLD_OUT" | "NEEDS_ATTENTION";
  errorCode?: string;
  errorMessage?: string;
}

export async function persistDisabled(input: DisabledStateInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.bundle.updateMany({
      where: disabledWhere(input),
      data: disabledBundle(input),
    });
    if (!updated.count) throw new Error("Bundle activation changed while disabling it.");
    await tx.shopifyProjection.upsert({
      where: { bundleId: input.bundleId },
      create: { bundleId: input.bundleId, ...disabledProjection(input) },
      update: disabledProjection(input),
    });
  });
}

function disabledWhere(input: DisabledStateInput) {
  if (input.revisionSource === "ACTIVE") {
    return { id: input.bundleId, activeRevision: input.revision, lockVersion: input.lockVersion };
  }
  return { id: input.bundleId, lockVersion: input.lockVersion };
}

function disabledBundle(input: DisabledStateInput) {
  return {
    status: input.status === "SOLD_OUT" ? ("ACTIVE" as const) : input.status,
    health: disabledHealth(input.status),
    countsTowardQuota: input.status === "SOLD_OUT",
    runtimeEnabled: false,
    publishedVerified: false,
    lastErrorCode: input.errorCode ?? null,
    lastErrorMessage: input.errorMessage?.slice(0, 1_000) ?? null,
    lockVersion: { increment: 1 },
  };
}

function disabledHealth(status: DisabledStateInput["status"]) {
  if (status === "PAUSED") return "READY" as const;
  if (status === "SOLD_OUT") return "SOLD_OUT" as const;
  return "NEEDS_ATTENTION" as const;
}

function disabledProjection(input: DisabledStateInput) {
  return {
    runtimeDigest: input.runtimeDigest,
    productStatus: "DRAFT",
    published: false,
    checkedAt: new Date(),
  };
}
