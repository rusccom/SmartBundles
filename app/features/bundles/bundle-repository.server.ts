import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import type { BundleSelectorInput } from "./bundle.types";

const BUNDLE_PAGE_SIZE = 50;

const listSelect = {
  id: true,
  publicId: true,
  price: true,
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
    price: bundle.price.toString(),
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
  price: true,
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
  return { ...bundle, price: bundle.price.toString(), selectors: mapSelectors(revision?.selectors ?? []) };
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
    options: selector.options.map((option) => ({
      id: option.variantGid,
      title: option.title,
      imageUrl: option.imageUrl ?? undefined,
      available: option.available,
    })),
  }));
}

interface SelectorRecord {
  selectorKey: number;
  label: string;
  productGid: string;
  productTitle: string;
  options: Array<{ variantGid: string; title: string; imageUrl: string | null; available: boolean }>;
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
  shop: true,
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
    select: { revision: true, parentPrice: true, ...revisionSelectorsSelect },
  });
  if (!revision) throw new Error("Bundle revision was not found.");
  return {
    bundle,
    revision,
    selectors: mapSelectors(revision.selectors),
    source: { price: revision.parentPrice.toString() },
  };
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
