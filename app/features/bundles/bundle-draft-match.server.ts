import { Prisma } from "@prisma/client";
import type { BundleDraftInput, BundleSelectorInput } from "./bundle.types";
import { calculateBundlePrices } from "./bundle-pricing";
import { BundleVersionConflictError } from "./BundleVersionConflictError.server";

const revisionSelect = {
  pricingMode: true,
  fixedPrice: true,
  discountPercent: true,
  parentPrice: true,
  selectors: {
    orderBy: { position: "asc" as const },
    select: {
      selectorKey: true, position: true, label: true, productGid: true, productTitle: true,
      quantity: true, discountPercent: true,
      options: {
        orderBy: { position: "asc" as const },
        select: { position: true, variantGid: true, title: true, imageUrl: true, available: true, unitPrice: true },
      },
    },
  },
} satisfies Prisma.BundleRevisionSelect;

type StoredRevision = Prisma.BundleRevisionGetPayload<{ select: typeof revisionSelect }>;

export async function assertStoredDraftMatches(
  tx: Prisma.TransactionClient,
  bundleId: string,
  draft: BundleDraftInput,
): Promise<void> {
  const [revision, count] = await Promise.all([
    tx.bundleRevision.findUnique({
      where: { bundleId_revision: { bundleId, revision: 1 } },
      select: revisionSelect,
    }),
    tx.bundleRevision.count({ where: { bundleId } }),
  ]);
  if (count === 1 && revision && sameDraft(revision, draft)) return;
  throw new BundleVersionConflictError("This creation token already belongs to a different bundle draft.");
}

function sameDraft(revision: StoredRevision, draft: BundleDraftInput): boolean {
  if (revision.pricingMode !== draft.pricingMode) return false;
  if (!sameNullableMoney(revision.fixedPrice, draft.fixedPrice)) return false;
  if (!revision.discountPercent.equals(new Prisma.Decimal(draft.discountPercent))) return false;
  const parentPrice = calculateBundlePrices(draft).finalPrice;
  if (!revision.parentPrice.equals(new Prisma.Decimal(parentPrice))) return false;
  return JSON.stringify(storedSelectors(revision)) === JSON.stringify(submittedSelectors(draft.selectors));
}

function sameNullableMoney(actual: Prisma.Decimal | null, expected: string | null): boolean {
  if (actual === null || expected === null) return actual === null && expected === null;
  return actual.equals(new Prisma.Decimal(expected));
}

function storedSelectors(revision: StoredRevision) {
  return revision.selectors.map((selector) => ({
    position: selector.position,
    key: selector.selectorKey,
    label: selector.label,
    productId: selector.productGid,
    productTitle: selector.productTitle,
    quantity: selector.quantity,
    discountPercent: selector.discountPercent.toString(),
    options: selector.options.map((option) => ({
      position: option.position, id: option.variantGid, title: option.title,
      imageUrl: option.imageUrl, available: option.available,
      unitPrice: option.unitPrice?.toString() ?? null,
    })),
  }));
}

function submittedSelectors(selectors: BundleSelectorInput[]) {
  return selectors.map((selector, position) => ({
    position,
    key: selector.key,
    label: selector.label,
    productId: selector.productId,
    productTitle: selector.productTitle,
    quantity: selector.quantity,
    discountPercent: new Prisma.Decimal(selector.discountPercent).toString(),
    options: selector.options.map((option, optionPosition) => ({
      position: optionPosition, id: option.id, title: option.title,
      imageUrl: option.imageUrl ?? null, available: option.available ?? true,
      unitPrice: normalizedMoney(option.unitPrice),
    })),
  }));
}

function normalizedMoney(value?: string): string | null {
  return value === undefined ? null : new Prisma.Decimal(value).toString();
}
