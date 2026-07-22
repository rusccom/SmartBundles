import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest } from "../shopify/admin-api.server";
import type { BundleSelectorInput } from "./bundle.types";
import { BundleComponentValidationError } from "./bundle-component-validation-error";

const VARIANTS_QUERY = `#graphql
  query SmartBundleVariants($ids: [ID!]!, $publicationId: ID!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        title
        price
        availableForSale
        requiresComponents
        productVariantComponents(first: 1) { nodes { id } }
        media(first: 1) { nodes { ... on MediaImage { image { url } } } }
        product {
          id
          title
          media(first: 1, query: "media_type:IMAGE", sortKey: POSITION) {
            nodes { ... on MediaImage { image { url } } }
          }
          publishedOnPublication(publicationId: $publicationId)
          bundleComponents(first: 1) { nodes { componentProduct { id } } }
          bundleId: metafield(namespace: "$app", key: "bundle_id") { value }
        }
      }
    }
  }
`;
const VARIANT_QUERY_BATCH = 40;

interface VariantNode {
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
  requiresComponents: boolean;
  productVariantComponents: { nodes: Array<{ id: string }> };
  media: { nodes: MediaNode[] };
  product: {
    id: string;
    title: string;
    media: { nodes: MediaNode[] };
    publishedOnPublication: boolean;
    bundleComponents: { nodes: Array<{ componentProduct: { id: string } }> };
    bundleId?: { value: string } | null;
  };
}

interface MediaNode { image?: { url: string } | null }

interface VariantQuery { nodes: Array<VariantNode | null> }

export async function verifyBundleSelectors(
  admin: AdminClient,
  selectors: BundleSelectorInput[],
  publicationId: string,
): Promise<BundleSelectorInput[]> {
  const ids = [...new Set(selectors.flatMap(({ options }) => options.map(({ id }) => id)))];
  const variants = await loadVariants(admin, ids, publicationId);
  const verified = selectors.map((selector) => verifiedSelector(selector, variants));
  if (verified.some(isSoldOut)) {
    throw new BundleComponentValidationError(
      "SOLD_OUT",
      "Each component needs an available variant.",
      verified,
    );
  }
  return verified;
}

async function loadVariants(
  admin: AdminClient,
  ids: string[],
  publicationId: string,
): Promise<Map<string, VariantNode>> {
  const variants = new Map<string, VariantNode>();
  for (let index = 0; index < ids.length; index += VARIANT_QUERY_BATCH) {
    const batch = ids.slice(index, index + VARIANT_QUERY_BATCH);
    const result = await adminRequest<VariantQuery>(admin, VARIANTS_QUERY, { ids: batch, publicationId });
    addVariants(variants, result.nodes);
  }
  return variants;
}

function addVariants(
  variants: Map<string, VariantNode>,
  nodes: Array<VariantNode | null>,
): void {
  nodes.forEach((node) => { if (node?.id) variants.set(node.id, node); });
}

function isSoldOut(selector: BundleSelectorInput): boolean {
  return !selector.options.some(({ available }) => available);
}

function verifiedSelector(
  selector: BundleSelectorInput,
  variants: Map<string, VariantNode>,
): BundleSelectorInput {
  const options = selector.options.map(({ id }) => verifiedOption(id, selector.productId, variants));
  const product = variants.get(options[0].id)?.product;
  const productTitle = product?.title ?? selector.productTitle;
  return { ...selector, label: productTitle, productTitle, options };
}

function verifiedOption(
  id: string,
  productId: string,
  variants: Map<string, VariantNode>,
) {
  const variant = variants.get(id);
  if (!variant || variant.product.id !== productId) invalidComponent("A selected variant no longer exists.");
  if (isBundleVariant(variant)) invalidComponent("Nested bundle components aren't supported.");
  if (!variant.product.publishedOnPublication) invalidComponent("Component products must be published to Online Store.");
  return {
    id,
    title: variant.title,
    imageUrl: variantImageUrl(variant),
    available: variant.availableForSale,
    unitPrice: variant.price,
  };
}

function variantImageUrl(variant: VariantNode): string | undefined {
  return variant.media.nodes[0]?.image?.url ?? variant.product.media.nodes[0]?.image?.url;
}

function invalidComponent(message: string): never {
  throw new BundleComponentValidationError("INVALID", message);
}

function isBundleVariant(variant: VariantNode): boolean {
  return Boolean(
    variant.requiresComponents ||
    variant.productVariantComponents.nodes.length ||
    variant.product.bundleComponents.nodes.length ||
    variant.product.bundleId?.value
  );
}
