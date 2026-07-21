import type { Prisma } from "@prisma/client";
import type { BundleDraftInput, BundleSelectorInput } from "./bundle.types";
import { calculateParentPrice } from "./bundle-pricing";
import type { ParentProductIds } from "./shopify-product.server";
import { BundleVersionConflictError } from "./BundleVersionConflictError.server";
import { assertStoredDraftMatches } from "./bundle-draft-match.server";
import { serializable } from "./bundle-quota.server";
import {
  bundleSaveClaimWhere,
  clearedBundleSaveClaim,
  type BundleSaveClaim,
} from "./bundle-save-claim.server";

const savedSelect = {
  id: true,
  publicId: true,
  parentProductGid: true,
  parentVariantGid: true,
  draftRevision: true,
  activeRevision: true,
  lockVersion: true,
} satisfies Prisma.BundleSelect;

export function saveBundleDraft(
  claim: BundleSaveClaim,
  draft: BundleDraftInput,
) {
  return serializable((tx) => saveExisting(tx, { claim, draft }));
}

export function createBundleDraft(
  shopId: string,
  publicId: string,
  parent: ParentProductIds,
  draft: BundleDraftInput,
) {
  return serializable((tx) => createIdempotent(tx, { shopId, publicId, parent, draft }));
}

interface SaveInput {
  claim: BundleSaveClaim;
  draft: BundleDraftInput;
}

async function saveExisting(tx: Prisma.TransactionClient, input: SaveInput) {
  const revision = await nextRevision(tx, input.claim.id);
  const updated = await tx.bundle.updateMany({
    where: bundleSaveClaimWhere(input.claim),
    data: draftUpdate(input.draft, revision),
  });
  if (updated.count !== 1) throw new BundleVersionConflictError();
  await tx.bundleRevision.create({
    data: revisionData(input.claim.id, revision, input.draft),
    select: { id: true },
  });
  return tx.bundle.findUniqueOrThrow({ where: { id: input.claim.id }, select: savedSelect });
}

async function nextRevision(tx: Prisma.TransactionClient, bundleId: string): Promise<number> {
  const result = await tx.bundleRevision.aggregate({ where: { bundleId }, _max: { revision: true } });
  return (result._max.revision ?? 0) + 1;
}

interface CreateInput {
  shopId: string;
  publicId: string;
  parent: ParentProductIds;
  draft: BundleDraftInput;
}

async function createIdempotent(tx: Prisma.TransactionClient, input: CreateInput) {
  const bundle = await tx.bundle.upsert({
    where: { shopId_publicId: { shopId: input.shopId, publicId: input.publicId } },
    update: {},
    create: newBundleData(input),
    select: savedSelect,
  });
  assertSameParent(bundle, input.parent);
  await assertStoredDraftMatches(tx, bundle.id, input.draft);
  return bundle;
}

function newBundleData(input: CreateInput): Prisma.BundleCreateInput {
  return {
    shop: { connect: { id: input.shopId } },
    publicId: input.publicId,
    pricingMode: input.draft.pricingMode,
    fixedPrice: input.draft.fixedPrice,
    parentProductGid: input.parent.productId,
    parentVariantGid: input.parent.variantId,
    draftRevision: 1,
    revisions: { create: nestedRevisionData(1, input.draft) },
  };
}

function assertSameParent(
  bundle: { parentProductGid: string | null; parentVariantGid: string | null },
  parent: ParentProductIds,
): void {
  if (bundle.parentProductGid !== parent.productId || bundle.parentVariantGid !== parent.variantId) {
    throw new BundleVersionConflictError("The signed creation token is already bound to another product.");
  }
}

function revisionData(
  bundleId: string,
  revision: number,
  draft: BundleDraftInput,
): Prisma.BundleRevisionCreateInput {
  return {
    bundle: { connect: { id: bundleId } },
    ...nestedRevisionData(revision, draft),
  };
}

function nestedRevisionData(revision: number, draft: BundleDraftInput) {
  return {
    revision,
    pricingMode: draft.pricingMode,
    fixedPrice: draft.fixedPrice,
    parentPrice: calculateParentPrice(draft.pricingMode, draft.fixedPrice, draft.selectors),
    selectors: { create: draft.selectors.map(selectorData) },
  };
}

function selectorData(selector: BundleSelectorInput, position: number) {
  return {
    selectorKey: selector.key,
    position,
    label: selector.label,
    productGid: selector.productId,
    productTitle: selector.productTitle,
    quantity: selector.quantity,
    options: { create: selector.options.map(optionData) },
  };
}

function optionData(option: BundleSelectorInput["options"][number], position: number) {
  return {
    position,
    variantGid: option.id,
    title: option.title,
    imageUrl: option.imageUrl,
    available: option.available ?? true,
    unitPrice: option.unitPrice,
  };
}

function draftUpdate(draft: BundleDraftInput, revision: number): Prisma.BundleUpdateInput {
  return {
    pricingMode: draft.pricingMode,
    fixedPrice: draft.fixedPrice,
    draftRevision: revision,
    lastErrorCode: null,
    lastErrorMessage: null,
    ...clearedBundleSaveClaim(),
    lockVersion: { increment: 1 },
  };
}
