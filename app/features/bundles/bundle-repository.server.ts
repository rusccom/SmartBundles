import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import { parseStoredStorefrontTexts } from "../settings/storefront-text-validation.server";
import type { BundleDraftInput, BundleSelectorInput } from "./bundle.types";
import type { ParentProductIds } from "./shopify-product.server";

const BUNDLE_PAGE_SIZE = 50;

const selectorInclude = {
  orderBy: { position: "asc" as const },
  include: { options: { orderBy: { position: "asc" as const } } },
};

const bundleListSelect = {
  id: true, publicId: true, pricingMode: true, status: true,
  updatedAt: true, parentProductGid: true,
  _count: { select: { selectors: true } },
} satisfies Prisma.BundleSelect;

const bundleActionSelect = {
  id: true, shopId: true, parentProductGid: true,
  parentVariantGid: true, status: true,
} satisfies Prisma.BundleSelect;

export async function listBundles(shopId: string, page: number) {
  const bundles = await prisma.bundle.findMany({
    where: { shopId },
    select: bundleListSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: page * BUNDLE_PAGE_SIZE,
    take: BUNDLE_PAGE_SIZE + 1,
  });
  return {
    bundles: bundles.slice(0, BUNDLE_PAGE_SIZE).map(toBundleListItem),
    hasNext: bundles.length > BUNDLE_PAGE_SIZE,
  };
}

function toBundleListItem(bundle: ListRecord) {
  return {
    id: bundle.id, publicId: bundle.publicId,
    pricingMode: bundle.pricingMode,
    status: bundle.status, componentCount: bundle._count.selectors,
    updatedAt: bundle.updatedAt.toISOString(),
    parentProductGid: bundle.parentProductGid,
  };
}

type ListRecord = Prisma.BundleGetPayload<{ select: typeof bundleListSelect }>;

export async function getBundleForEditor(shopId: string, bundleId: string) {
  const bundle = await prisma.bundle.findFirst({
    where: { id: bundleId, shopId },
    include: { selectors: selectorInclude },
  });
  if (!bundle) throw new Response("Bundle not found", { status: 404 });
  return {
    ...bundle,
    discountPercent: bundle.discountPercent.toString(),
    selectors: bundle.selectors.map(storedSelector),
  };
}

export async function getBundleForAction(shopId: string, bundleId: string) {
  const bundle = await prisma.bundle.findFirst({
    where: { id: bundleId, shopId },
    select: bundleActionSelect,
  });
  if (!bundle) throw new Response("Bundle not found", { status: 404 });
  return bundle;
}

export async function getBundleForActionByDomain(domain: string, bundleId: string) {
  const bundle = await prisma.bundle.findFirst({
    where: { id: bundleId, shop: { domain } },
    select: bundleActionSelect,
  });
  if (!bundle) throw new Response("Bundle not found", { status: 404 });
  return bundle;
}

export async function getBundleShopId(domain: string): Promise<string> {
  const shop = await prisma.shop.findUnique({
    where: { domain },
    select: { id: true },
  });
  if (!shop) throw new Response("Shop not found", { status: 404 });
  return shop.id;
}

export function activeBundleCount(shopId: string): Promise<number> {
  return prisma.bundle.count({ where: { shopId, status: "ACTIVE" } });
}

export async function createBundle(
  shopId: string, publicId: string, parent: ParentProductIds, draft: BundleDraftInput,
) {
  const selectors = draft.selectors.map(selectorCreate);
  return prisma.bundle.upsert({
    where: { shopId_publicId: { shopId, publicId } },
    create: {
      shopId, publicId, parentProductGid: parent.productId,
      parentVariantGid: parent.variantId, pricingMode: draft.pricingMode,
      discountPercent: draft.discountPercent, selectors: { create: selectors },
    },
    update: {
      parentProductGid: parent.productId, parentVariantGid: parent.variantId,
      pricingMode: draft.pricingMode, discountPercent: draft.discountPercent,
      selectors: { deleteMany: {}, create: selectors },
    },
    select: { id: true, status: true },
  });
}

export function saveBundleConfiguration(
  shopId: string,
  bundleId: string,
  draft: BundleDraftInput,
) {
  return prisma.bundle.update({
    where: { id: bundleId, shopId },
    data: {
      pricingMode: draft.pricingMode,
      discountPercent: draft.discountPercent,
      selectors: {
        deleteMany: {},
        create: draft.selectors.map(selectorCreate),
      },
    },
    select: { id: true, status: true },
  });
}

export function setBundleStatus(
  shopId: string,
  bundleId: string,
  status: "DRAFT" | "ACTIVE",
) {
  return prisma.bundle.update({
    where: { id: bundleId, shopId },
    data: { status },
    select: { id: true, status: true },
  });
}

export async function getBundleForProjection(shopId: string, bundleId: string) {
  const bundle = await prisma.bundle.findFirst({
    where: { id: bundleId, shopId },
    include: {
      selectors: selectorInclude,
      shop: { select: {
        currencyCode: true, onlineStorePublicationGid: true,
        storefrontTexts: true, storefrontTextVersion: true,
      } },
    },
  });
  if (!bundle) throw new Error("Bundle not found.");
  return {
    ...bundle,
    discountPercent: bundle.discountPercent.toString(),
    storefrontTexts: parseStoredStorefrontTexts(bundle.shop.storefrontTexts),
    selectors: bundle.selectors.map(storedSelector),
  };
}

function selectorCreate(selector: BundleSelectorInput, position: number) {
  return {
    selectorKey: selector.key, position, productGid: selector.productId,
    quantity: selector.quantity, discountPercent: selector.discountPercent,
    options: { create: selector.options.map(optionCreate) },
  };
}

function optionCreate(option: BundleSelectorInput["options"][number], position: number) {
  return { position, variantGid: option.id };
}

interface StoredSelector {
  selectorKey: number;
  productGid: string;
  quantity: number;
  discountPercent: Prisma.Decimal;
  options: Array<{ variantGid: string }>;
}

function storedSelector(selector: StoredSelector): BundleSelectorInput {
  return {
    key: selector.selectorKey, label: "", productId: selector.productGid,
    productTitle: "", quantity: selector.quantity,
    discountPercent: selector.discountPercent.toString(),
    options: selector.options.map(({ variantGid }) => ({ id: variantGid, title: "" })),
  };
}
