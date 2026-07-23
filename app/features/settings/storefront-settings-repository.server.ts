import type { Prisma } from "@prisma/client";
import prisma from "../../db.server";
import { serializable } from "../bundles/bundle-quota.server";
import { StorefrontSettingsConflictError } from "./StorefrontSettingsConflictError.server";
import type { StorefrontTexts } from "./storefront-text.types";
import { queueShopStorefrontTextSync } from "./storefront-text-sync.server";
import { parseStoredStorefrontTexts } from "./storefront-text-validation.server";

const settingsSelect = {
  id: true,
  storefrontTexts: true,
  storefrontTextVersion: true,
} satisfies Prisma.ShopSelect;

export async function getShopStorefrontSettings(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: settingsSelect,
  });
  if (!shop) throw new Response("Shop not found", { status: 404 });
  return {
    textVersion: shop.storefrontTextVersion,
    texts: parseStoredStorefrontTexts(shop.storefrontTexts),
  };
}

export interface SaveShopStorefrontTextsInput {
  shopId: string;
  expectedTextVersion: number;
  texts: StorefrontTexts;
}

export function saveShopStorefrontTexts(input: SaveShopStorefrontTextsInput) {
  return serializable((tx) => saveInTransaction(tx, input));
}

async function saveInTransaction(
  tx: Prisma.TransactionClient,
  input: SaveShopStorefrontTextsInput,
) {
  const textVersion = input.expectedTextVersion + 1;
  const updated = await tx.shop.updateMany({
    where: { id: input.shopId, storefrontTextVersion: input.expectedTextVersion },
    data: {
      storefrontTexts: input.texts as unknown as Prisma.InputJsonValue,
      storefrontTextVersion: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new StorefrontSettingsConflictError();
  const queued = await queueShopStorefrontTextSync(tx, input.shopId, textVersion);
  return { queued, textVersion };
}
