import type { AdminClient } from "../shopify/admin-api.server";
import { buildPresentationConfig, disabledRuntime } from "./bundle-config.server";
import type { getBundleForProjection } from "./bundle-repository.server";
import type { BundleDraftInput } from "./bundle.types";
import { writeProductMetafields } from "./shopify-product.server";
import { syncBundleMemberships } from "./storefront/bundle-membership.server";
import { variantReferenceFields } from "./storefront/variant-references.server";

type ProjectionBundle = Awaited<ReturnType<typeof getBundleForProjection>>;

export async function writeUnavailableProjection(admin: AdminClient, bundle: ProjectionBundle, draft: BundleDraftInput) {
  const identity = { publicId: bundle.publicId, parentVariantId: bundle.parentVariantGid,
    pricingMode: draft.pricingMode, discountPercent: draft.discountPercent };
  const presentation = buildPresentationConfig(identity, draft.selectors, {
    version: bundle.shop.storefrontTextVersion, texts: bundle.storefrontTexts,
  });
  await writeProductMetafields(admin, bundle.parentProductGid, [
    { key: "bundle_runtime", value: JSON.stringify(disabledRuntime(bundle.publicId, bundle.parentVariantGid)) },
    { key: "bundle_presentation", value: JSON.stringify(presentation) },
    ...variantReferenceFields(draft.selectors),
  ]);
  await syncBundleMemberships(admin, { ...identity, selectors: draft.selectors,
    previousSelectors: bundle.selectors, enabled: false });
}
