import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest } from "../shopify/admin-api.server";
import type { BundleSelectorInput } from "./bundle.types";
import { BundleComponentValidationError } from "./bundle-component-validation-error";

const VARIANTS_QUERY = `#graphql
  query SmartBundleProjectionVariants($ids: [ID!]!) {
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
          bundleComponents(first: 1) { nodes { componentProduct { id } } }
          bundleId: metafield(namespace: "$app", key: "bundle_id") { value }
        }
      }
    }
  }
`;

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
    bundleComponents: { nodes: Array<{ componentProduct: { id: string } }> };
    bundleId?: { value: string } | null;
  };
}

interface MediaNode { image?: { url: string } | null }

interface VariantQuery { nodes: Array<VariantNode | null> }

export async function hydrateProjectionSelectors(
  admin: AdminClient,
  selectors: BundleSelectorInput[],
): Promise<BundleSelectorInput[]> {
  const ids = [...new Set(selectors.flatMap(({ options }) => options.map(({ id }) => id)))];
  const variants = await loadVariants(admin, ids);
  return selectors.map((selector) => hydratedSelector(selector, variants));
}

async function loadVariants(
  admin: AdminClient,
  ids: string[],
): Promise<Map<string, VariantNode>> {
  const result = await adminRequest<VariantQuery>(admin, VARIANTS_QUERY, { ids });
  const nodes = result.nodes.filter(isVariantNode);
  return new Map(nodes.map((node) => [node.id, node]));
}

function hydratedSelector(
  selector: BundleSelectorInput,
  variants: Map<string, VariantNode>,
): BundleSelectorInput {
  const options = selector.options.map(({ id }) => hydratedOption(id, selector.productId, variants));
  const product = variants.get(options[0].id)?.product;
  const productTitle = product?.title ?? selector.productTitle;
  return { ...selector, label: productTitle, productTitle, options };
}

function hydratedOption(
  id: string,
  productId: string,
  variants: Map<string, VariantNode>,
) {
  const variant = variants.get(id);
  if (!variant || variant.product.id !== productId) invalidComponent("A selected variant no longer exists.");
  if (isBundleVariant(variant)) invalidComponent("Nested bundle components aren't supported.");
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
  throw new BundleComponentValidationError(message);
}

function isVariantNode(value: VariantNode | null): value is VariantNode {
  return Boolean(value?.id);
}

function isBundleVariant(variant: VariantNode): boolean {
  return Boolean(
    variant.requiresComponents ||
    variant.productVariantComponents.nodes.length ||
    variant.product.bundleComponents.nodes.length ||
    variant.product.bundleId?.value
  );
}
