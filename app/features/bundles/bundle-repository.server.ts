import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import { parseStoredStorefrontTexts } from "../settings/storefront-text-validation.server";
import type { BundleSelectorInput } from "./bundle.types";

const BUNDLE_PAGE_SIZE = 50;

const listSelect = {
  id: true,
  publicId: true,
  pricingMode: true,
  fixedPrice: true,
  status: true,
  health: true,
  updatedAt: true,
  parentProductGid: true,
  revisions: {
    take: 1,
    orderBy: { revision: "desc" as const },
    select: { selectors: { select: { id: true } } },
  },
} satisfies Prisma.BundleSelect;

type BundleListRecord = Prisma.BundleGetPayload<{ select: typeof listSelect }>;

export async function listBundles(shopId: string, page: number) {
  const bundles = await prisma.bundle.findMany({
    where: { shopId, status: { not: "ARCHIVED" } },
    select: listSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: page * BUNDLE_PAGE_SIZE,
    take: BUNDLE_PAGE_SIZE + 1,
  });
  return {
    bundles: bundles.slice(0, BUNDLE_PAGE_SIZE).map(toBundleListItem),
    hasNext: bundles.length > BUNDLE_PAGE_SIZE,
  };
}

function toBundleListItem(bundle: BundleListRecord) {
  return {
    id: bundle.id,
    publicId: bundle.publicId,
    pricingMode: bundle.pricingMode,
    fixedPrice: bundle.fixedPrice?.toString() ?? null,
    status: bundle.status,
    health: bundle.health,
    componentCount: bundle.revisions[0]?.selectors.length ?? 0,
    updatedAt: bundle.updatedAt.toISOString(),
    parentProductGid: bundle.parentProductGid,
  };
}

const editorSelect = {
  id: true,
  publicId: true,
  pricingMode: true,
  fixedPrice: true,
  discountPercent: true,
  status: true,
  parentProductGid: true,
  parentVariantGid: true,
  draftRevision: true,
  activeRevision: true,
  lockVersion: true,
} satisfies Prisma.BundleSelect;

export async function getBundleForEditor(shopId: string, bundleId: string) {
  const bundle = await prisma.bundle.findFirst({
    where: { id: bundleId, shopId },
    select: editorSelect,
  });
  if (!bundle) throw new Response("Bundle not found", { status: 404 });
  const revision = await loadEditorRevision(bundle.id, bundle.draftRevision, bundle.activeRevision);
  return {
    ...bundle,
    fixedPrice: bundle.fixedPrice?.toString() ?? null,
    discountPercent: bundle.discountPercent.toString(),
    selectors: mapSelectors(revision?.selectors ?? []),
  };
}

async function loadEditorRevision(
  bundleId: string,
  draftRevision: number | null,
  activeRevision: number | null,
) {
  const revision = draftRevision ?? activeRevision;
  if (!revision) return null;
  return prisma.bundleRevision.findUnique({
    where: { bundleId_revision: { bundleId, revision } },
    select: revisionSelectorsSelect,
  });
}

const revisionSelectorsSelect = {
  selectors: {
    orderBy: { position: "asc" as const },
    include: { options: { orderBy: { position: "asc" as const } } },
  },
};

function mapSelectors(selectors: SelectorRecord[]): BundleSelectorInput[] {
  return selectors.map((selector) => ({
    key: selector.selectorKey,
    label: selector.label,
    productId: selector.productGid,
    productTitle: selector.productTitle,
    quantity: selector.quantity,
    discountPercent: selector.discountPercent.toString(),
    options: selector.options.map((option) => ({
      id: option.variantGid,
      title: option.title,
      imageUrl: option.imageUrl ?? undefined,
      available: option.available,
      unitPrice: option.unitPrice?.toString(),
    })),
  }));
}

interface SelectorRecord {
  selectorKey: number;
  label: string;
  productGid: string;
  productTitle: string;
  quantity: number;
  discountPercent: Prisma.Decimal;
  options: Array<{
    variantGid: string;
    title: string;
    imageUrl: string | null;
    available: boolean;
    unitPrice: Prisma.Decimal | null;
  }>;
}

const publicationBundleSelect = {
  id: true,
  shopId: true,
  publicId: true,
  parentProductGid: true,
  parentVariantGid: true,
  activeRevision: true,
  draftRevision: true,
  lockVersion: true,
  shop: {
    select: {
      currencyCode: true,
      onlineStorePublicationGid: true,
      eligibleForBundles: true,
      ineligibilityReason: true,
      cartTransformGid: true,
      storefrontTexts: true,
      storefrontTextVersion: true,
    },
  },
  projection: true,
} satisfies Prisma.BundleSelect;

type PublicationBundle = Prisma.BundleGetPayload<{ select: typeof publicationBundleSelect }>;

export async function loadPublicationBundle(bundleId: string) {
  const bundle = await publicationBundle(bundleId);
  const selectedRevision = bundle?.draftRevision ?? bundle?.activeRevision;
  if (!bundle || !selectedRevision) throw new Error("Bundle has no publishable revision.");
  return loadPublicationRevision(bundle, selectedRevision);
}

export async function loadPublicationBundleAtRevision(bundleId: string, revision: number) {
  const bundle = await publicationBundle(bundleId);
  if (!bundle) throw new Error("Bundle was not found.");
  return loadPublicationRevision(bundle, revision);
}

function publicationBundle(bundleId: string) {
  return prisma.bundle.findUnique({ where: { id: bundleId }, select: publicationBundleSelect });
}

async function loadPublicationRevision(bundle: PublicationBundle, selectedRevision: number) {
  const revision = await prisma.bundleRevision.findUnique({
    where: { bundleId_revision: { bundleId: bundle.id, revision: selectedRevision } },
    select: {
      revision: true,
      pricingMode: true,
      fixedPrice: true,
      discountPercent: true,
      parentPrice: true,
      ...revisionSelectorsSelect,
    },
  });
  if (!revision) throw new Error("Bundle revision was not found.");
  return {
    bundle,
    revision,
    selectors: mapSelectors(revision.selectors),
    source: publicationSource(bundle, revision),
  };
}

function publicationSource(bundle: PublicationBundle, revision: PublicationRevision) {
  return {
    pricingMode: revision.pricingMode,
    fixedPrice: revision.fixedPrice?.toString() ?? null,
    discountPercent: revision.discountPercent.toString(),
    parentPrice: revision.parentPrice.toString(),
    currencyCode: requiredCurrencyCode(bundle.shop.currencyCode),
    storefrontTextSource: {
      version: bundle.shop.storefrontTextVersion,
      texts: parseStoredStorefrontTexts(bundle.shop.storefrontTexts),
    },
  };
}

interface PublicationRevision {
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: Prisma.Decimal | null;
  discountPercent: Prisma.Decimal;
  parentPrice: Prisma.Decimal;
}

function requiredCurrencyCode(value: string | null): string {
  if (!value) throw new Error("Shop currency is unavailable.");
  return value;
}

export function activeBundleCount(shopId: string): Promise<number> {
  return prisma.bundle.count({ where: { shopId, countsTowardQuota: true } });
}

export function listReplacementCandidates(shopId: string, excludedId: string) {
  return prisma.bundle.findMany({
    where: {
      shopId,
      id: { not: excludedId },
      countsTowardQuota: true,
      activeRevision: { not: null },
      status: { notIn: ["PUBLISHING", "UPDATING", "PAUSING"] },
    },
    select: { id: true, publicId: true, parentProductGid: true },
    orderBy: [{ activatedAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function archiveBundle(shopId: string, bundleId: string): Promise<void> {
  const bundle = await prisma.bundle.findFirst({
    where: { id: bundleId, shopId },
    select: { countsTowardQuota: true, lockVersion: true, editorSaveToken: true },
  });
  if (!bundle || bundle.countsTowardQuota || bundle.editorSaveToken) {
    throw new Error("Only inactive bundles without pending saves can be archived.");
  }
  const archived = await prisma.bundle.updateMany({
    where: { id: bundleId, shopId, lockVersion: bundle.lockVersion, editorSaveToken: null },
    data: { status: "ARCHIVED", lockVersion: { increment: 1 } },
  });
  if (archived.count !== 1) throw new Error("Concurrent bundle operation detected.");
}
