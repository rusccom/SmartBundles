import { createHash } from "node:crypto";
import type { AdminClient } from "../../shopify/admin-api.server";
import type { BundleMembership, BundleMembershipInput } from "./bundle-membership.types";
import { writeMembership } from "./shopify-membership.server";

export async function syncBundleMemberships(admin: AdminClient, input: BundleMembershipInput): Promise<void> {
  const variantIds = new Set([...input.previousSelectors, ...input.selectors].flatMap(({ options }) => options.map(({ id }) => id)));
  const revision = createHash("sha256").update(JSON.stringify(membershipShape(input))).digest("hex");
  const ids = [...variantIds];
  for (let index = 0; index < ids.length; index += 5) {
    await Promise.all(ids.slice(index, index + 5).map((variantId) =>
      writeMembership(admin, variantId, input.publicId, membershipForVariant(input, revision, variantId))));
  }
}

function membershipShape(input: BundleMembershipInput) {
  return {
    p: input.parentVariantId, d: input.discountPercent,
    s: input.selectors.map((selector) => ({
      k: selector.key, q: selector.quantity, d: selector.discountPercent,
      v: selector.options.map(({ id }) => id),
    })),
  };
}

function membershipForVariant(input: BundleMembershipInput, revision: string, variantId: string): BundleMembership | null {
  const selectors = input.selectors.filter(({ options }) => options.some(({ id }) => id === variantId));
  if (!input.enabled || !selectors.length) return null;
  return {
    b: input.publicId, p: input.parentVariantId, r: revision,
    n: input.selectors.length, d: input.discountPercent,
    s: selectors.map((selector) => ({
      k: selector.key, q: selector.quantity, d: selector.discountPercent,
    })),
  };
}
