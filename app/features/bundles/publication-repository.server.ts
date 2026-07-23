import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import type { BundleSelectorInput } from "./bundle.types";

export interface ProjectionRecord {
  bundleId: string;
  revision: number;
  runtimeConfig: Prisma.InputJsonValue;
  presentationConfig: Prisma.InputJsonValue;
  runtimeBytes: number;
  runtimeHash: string;
  presentationHash: string;
  parentPrice: string;
  selectors: BundleSelectorInput[];
  runtimeMetafieldId?: string;
  runtimeDigest?: string;
  presentationMetafieldId?: string;
  presentationDigest?: string;
}

export async function saveProjection(
  record: ProjectionRecord,
  claimVersion: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertProjectionClaim(tx, record.bundleId, claimVersion);
    const revision = await tx.bundleRevision.update({
      where: { bundleId_revision: { bundleId: record.bundleId, revision: record.revision } },
      data: revisionProjection(record),
      select: { id: true },
    });
    await saveSelectorSnapshots(tx, revision.id, record.selectors);
    await tx.shopifyProjection.upsert({
      where: { bundleId: record.bundleId },
      create: projectionCreate(record),
      update: projectionUpdate(record),
    });
  });
}

async function assertProjectionClaim(
  tx: Prisma.TransactionClient,
  bundleId: string,
  claimVersion: number,
): Promise<void> {
  const claimed = await tx.bundle.updateMany({
    where: {
      id: bundleId,
      lockVersion: claimVersion,
      status: { in: ["PUBLISHING", "UPDATING"] },
    },
    data: { lockVersion: claimVersion },
  });
  if (claimed.count !== 1) throw new Error("Bundle projection claim expired.");
}

function revisionProjection(record: ProjectionRecord) {
  return {
    runtimeConfig: record.runtimeConfig,
    presentationConfig: record.presentationConfig,
    parentPrice: record.parentPrice,
    runtimeBytes: record.runtimeBytes,
    runtimeHash: record.runtimeHash,
    presentationHash: record.presentationHash,
  };
}

async function saveSelectorSnapshots(
  tx: Prisma.TransactionClient,
  revisionId: string,
  selectors: BundleSelectorInput[],
): Promise<void> {
  for (const selector of selectors) {
    await tx.bundleSelector.update({
      where: { revisionId_selectorKey: { revisionId, selectorKey: selector.key } },
      data: selectorSnapshot(selector),
    });
  }
}

function selectorSnapshot(selector: BundleSelectorInput) {
  return {
    productTitle: selector.productTitle,
    quantity: selector.quantity,
    discountPercent: selector.discountPercent,
    options: { updateMany: selector.options.map(optionSnapshot) },
  };
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

function projectionCreate(record: ProjectionRecord) {
  return { bundleId: record.bundleId, ...projectionUpdate(record) };
}

function projectionUpdate(record: ProjectionRecord) {
  return {
    runtimeMetafieldId: record.runtimeMetafieldId,
    runtimeDigest: record.runtimeDigest,
    runtimeHash: record.runtimeHash,
    presentationMetafieldId: record.presentationMetafieldId,
    presentationDigest: record.presentationDigest,
    presentationHash: record.presentationHash,
  };
}

export async function markPublished(input: PublishedRecord): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const bundle = await claimedPublishingBundle(tx, input);
    await supersedeRevision(tx, input.bundleId, input.revision);
    await tx.bundleRevision.update({
      where: { bundleId_revision: { bundleId: input.bundleId, revision: input.revision } },
      data: { status: "PUBLISHED" },
      select: { id: true },
    });
    const updated = await tx.bundle.updateMany({
      where: { id: input.bundleId, lockVersion: input.claimVersion, status: bundle.status },
      data: publishedBundle(bundle, input.revision),
    });
    if (updated.count !== 1) throw new Error("Bundle publication claim expired.");
    await tx.shopifyProjection.update({ where: { bundleId: input.bundleId }, data: publishedProjection(input) });
  });
}

export interface PublishedRecord {
  bundleId: string;
  revision: number;
  runtimeDigest: string;
  presentationDigest: string;
  storefrontTextVersion: number;
  claimVersion: number;
}

function claimedPublishingBundle(tx: Prisma.TransactionClient, input: PublishedRecord) {
  return tx.bundle.findFirstOrThrow({
    where: {
      id: input.bundleId,
      lockVersion: input.claimVersion,
      status: { in: ["PUBLISHING", "UPDATING"] },
    },
    select: { activatedAt: true, draftRevision: true, status: true },
  });
}

function supersedeRevision(tx: Prisma.TransactionClient, bundleId: string, revision: number) {
  return tx.bundleRevision.updateMany({
    where: { bundleId, revision: { not: revision }, status: "PUBLISHED" },
    data: { status: "SUPERSEDED" },
  });
}

function publishedBundle(
  bundle: { activatedAt: Date | null; draftRevision: number | null },
  revision: number,
) {
  return {
    status: "ACTIVE" as const,
    health: "READY" as const,
    activeRevision: revision,
    draftRevision: bundle.draftRevision === revision ? null : bundle.draftRevision,
    runtimeEnabled: true,
    publishedVerified: true,
    activatedAt: bundle.activatedAt ?? new Date(),
    lastErrorCode: null,
    lastErrorMessage: null,
    lockVersion: { increment: 1 },
  };
}

function publishedProjection(input: PublishedRecord) {
  return {
    runtimeDigest: input.runtimeDigest,
    presentationDigest: input.presentationDigest,
    storefrontTextVersion: input.storefrontTextVersion,
    productStatus: "ACTIVE",
    published: true,
    checkedAt: new Date(),
  };
}
