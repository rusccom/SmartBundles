import { adminRequest, type AdminClient } from "../../shopify/admin-api.server";
import type { BundleMembership } from "./bundle-membership.types";

const READ_MEMBERSHIP = `#graphql
  query BundleMembership($id: ID!) {
    variant: productVariant(id: $id) {
      membership: metafield(namespace: "$app", key: "bundle_memberships") { jsonValue compareDigest }
    }
  }
`;
const WRITE_MEMBERSHIP = `#graphql
  mutation BundleMembershipWrite($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) { userErrors { message } }
  }
`;

interface MembershipField { jsonValue: { sv: number; bundles: BundleMembership[] }; compareDigest: string }
interface MembershipRead { variant: { membership: MembershipField | null } | null }
interface MembershipWrite { metafieldsSet: { userErrors: Array<{ message: string }> } }

export async function writeMembership(
  admin: AdminClient, variantId: string, bundleId: string, membership: BundleMembership | null,
): Promise<void> {
  let message = "Bundle membership could not be synchronized.";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { variant } = await adminRequest<MembershipRead>(admin, READ_MEMBERSHIP, { id: variantId });
    if (!variant) return;
    const field = membershipField(variantId, variant.membership, bundleId, membership);
    if (!field) return;
    const result = await adminRequest<MembershipWrite>(admin, WRITE_MEMBERSHIP, { metafields: [field] });
    if (!result.metafieldsSet.userErrors.length) return;
    message = result.metafieldsSet.userErrors.map(({ message }) => message).join("; ");
  }
  throw new Error(message);
}

function membershipField(
  ownerId: string, stored: MembershipField | null, bundleId: string, membership: BundleMembership | null,
) {
  const existing = existingMemberships(stored);
  if (sameMembership(existing.find(({ b }) => b === bundleId), membership)) return null;
  const bundles = existing.filter(({ b }) => b !== bundleId);
  if (membership) bundles.push(membership);
  bundles.sort((first, second) => first.b.localeCompare(second.b));
  const value = JSON.stringify({ sv: 1, bundles });
  if (Buffer.byteLength(value, "utf8") > 9_500) throw new Error("Variant bundle memberships exceed Shopify's Function limit.");
  return { ownerId, namespace: "$app", key: "bundle_memberships", type: "json", value,
    compareDigest: stored?.compareDigest ?? null };
}

function sameMembership(stored: BundleMembership | undefined, membership: BundleMembership | null): boolean {
  if (!stored || !membership) return !stored && !membership;
  return stored.b === membership.b && stored.p === membership.p && stored.r === membership.r
    && stored.n === membership.n && stored.d === membership.d && stored.s.length === membership.s.length
    && stored.s.every((slot, index) => slot.k === membership.s[index].k
      && slot.q === membership.s[index].q && slot.d === membership.s[index].d);
}

function existingMemberships(stored: MembershipField | null): BundleMembership[] {
  if (!stored) return [];
  if (stored.jsonValue.sv !== 1 || !Array.isArray(stored.jsonValue.bundles)) {
    throw new Error("Variant bundle memberships are invalid.");
  }
  return stored.jsonValue.bundles;
}
