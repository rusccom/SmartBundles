import type { AdminClient } from "../../shopify/admin-api.server";
import type { BundleContentSubmission } from "../bundle.types";
import { BundleContentError } from "./BundleContentError.server";
import { verifyCreationToken } from "./content-token.server";
import { validateCreationContent } from "./content-validation.server";
import { findOrCreateParentProduct } from "./shopify-product-content.server";

export async function createSubmittedParent(
  admin: AdminClient,
  shopDomain: string,
  creationToken: string,
  content: BundleContentSubmission,
) {
  const token = verifyCreationToken(creationToken);
  if (token.shopDomain !== shopDomain) throw invalidCreationToken();
  const errors = validateCreationContent(content.title, content.descriptionHtml);
  if (Object.keys(errors).length) {
    throw new BundleContentError("Fix the Shopify content fields before creating the bundle.", 422, errors);
  }
  const parent = await findOrCreateParentProduct(admin, {
    publicId: token.publicId,
    title: content.title,
    descriptionHtml: content.descriptionHtml,
  });
  return { publicId: token.publicId, parent };
}

function invalidCreationToken(): BundleContentError {
  return new BundleContentError("The signed creation token does not match this shop. Reload and try again.", 400);
}
