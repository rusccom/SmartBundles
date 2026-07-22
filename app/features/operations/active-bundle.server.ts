import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import type { BundlePricingMode, BundleSelectorInput } from "../bundles/bundle.types";

export interface ActiveBundle {
  bundle: ActiveBundleRecord;
  revision: ActiveRevisionRecord;
  selectors: BundleSelectorInput[];
  source: ActiveParentSource;
  revisionSource: "ACTIVE" | "DRAFT";
}

export interface ActiveParentSource {
  pricingMode: BundlePricingMode;
  fixedPrice: string | null;
  discountPercent: string;
  parentPrice: string;
  currencyCode: string;
}

interface ActiveBundleRecord {
  id: string;
  shopId: string;
  publicId: string;
  parentProductGid: string | null;
  parentVariantGid: string | null;
  activeRevision: number | null;
  draftRevision: number | null;
  countsTowardQuota: boolean;
  status: string;
  runtimeEnabled: boolean;
  lockVersion: number;
  updatedAt: Date;
  shop: { domain: string; currencyCode: string | null; onlineStorePublicationGid: string | null };
  projection: { runtimeDigest: string | null; presentationDigest: string | null } | null;
}

interface ActiveRevisionRecord {
  revision: number;
  runtimeConfig: Prisma.JsonValue | null;
  pricingMode: BundlePricingMode;
  fixedPrice: Prisma.Decimal | null;
  discountPercent: Prisma.Decimal;
  parentPrice: Prisma.Decimal;
}

export async function loadActiveBundle(bundleId: string): Promise<ActiveBundle | null> {
  const bundle = await prisma.bundle.findUnique({
    where: { id: bundleId },
    select: bundleSelect,
  });
  if (!bundle?.activeRevision) return null;
  return loadRevisionBundle(bundle, bundle.activeRevision, "ACTIVE");
}

export async function loadPauseBundle(
  bundleId: string,
  revision: number,
): Promise<ActiveBundle | null> {
  const bundle = await prisma.bundle.findUnique({ where: { id: bundleId }, select: bundleSelect });
  if (!bundle) return null;
  const source = pauseRevisionSource(bundle, revision);
  if (!source) return null;
  return loadRevisionBundle(bundle, revision, source);
}

async function loadRevisionBundle(
  bundle: ActiveBundleRecord,
  revisionNumber: number,
  revisionSource: "ACTIVE" | "DRAFT",
): Promise<ActiveBundle | null> {
  const revision = await prisma.bundleRevision.findUnique({
    where: { bundleId_revision: { bundleId: bundle.id, revision: revisionNumber } },
    select: revisionSelect,
  });
  if (!revision) return null;
  return {
    bundle,
    revision,
    selectors: mapSelectors(revision.selectors),
    source: activeSource(bundle, revision),
    revisionSource,
  };
}

function activeSource(bundle: ActiveBundleRecord, revision: ActiveRevisionRecord) {
  return {
    pricingMode: revision.pricingMode,
    fixedPrice: revision.fixedPrice?.toString() ?? null,
    discountPercent: revision.discountPercent.toString(),
    parentPrice: revision.parentPrice.toString(),
    currencyCode: requiredCurrencyCode(bundle.shop.currencyCode),
  };
}

function pauseRevisionSource(
  bundle: ActiveBundleRecord,
  revision: number,
): "ACTIVE" | "DRAFT" | null {
  if (bundle.activeRevision === revision) return "ACTIVE";
  if (bundle.draftRevision === revision) return "DRAFT";
  if (bundle.status === "PAUSING") return "DRAFT";
  return null;
}

const bundleSelect = {
  id: true,
  shopId: true,
  publicId: true,
  parentProductGid: true,
  parentVariantGid: true,
  activeRevision: true,
  draftRevision: true,
  countsTowardQuota: true,
  status: true,
  runtimeEnabled: true,
  lockVersion: true,
  updatedAt: true,
  shop: { select: { domain: true, currencyCode: true, onlineStorePublicationGid: true } },
  projection: { select: { runtimeDigest: true, presentationDigest: true } },
};

const revisionSelect = {
  revision: true,
  runtimeConfig: true,
  pricingMode: true,
  fixedPrice: true,
  discountPercent: true,
  parentPrice: true,
  selectors: {
    orderBy: { position: "asc" as const },
    include: { options: { orderBy: { position: "asc" as const } } },
  },
};

type SelectorRecord = Awaited<ReturnType<typeof selectorShape>>;

async function selectorShape() {
  return prisma.bundleSelector.findFirstOrThrow({
    include: { options: true },
  });
}

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

function requiredCurrencyCode(value: string | null): string {
  if (!value) throw new Error("Shop currency is unavailable.");
  return value;
}
