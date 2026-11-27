import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest } from "../shopify/admin-api.server";
import type { BundleSelectorInput } from "./bundle.types";
import { BundleComponentValidationError } from "./bundle-component-validation-error";

const VARIANTS_QUERY = `#graphql
  query SmartBundleProjectionVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        price
        position
        requiresComponents
        productVariantComponents(first: 1) { nodes { id } }
        product {
          id
          bundleComponents(first: 1) { nodes { componentProduct { id } } }
          bundleId: metafield(namespace: "$app", key: "bundle_id") { value }
        }
      }
    }
  }
`;

interface VariantNode {
  id: string;
  price: string;
  position: number;
  requiresComponents: boolean;
  productVariantComponents: { nodes: Array<{ id: string }> };
  product: {
    id: string;
    bundleComponents: { nodes: Array<{ componentProduct: { id: string } }> };
    bundleId?: { value: string } | null;
  };
}

interface VariantQuery { nodes: Array<VariantNode | null> }

export async function hydrateProjectionSelectors(
  admin: AdminClient,
  selectors: BundleSelectorInput[],
  allowMissing = false,
): Promise<BundleSelectorInput[]> {
  const ids = [...new Set(selectors.flatMap(({ options }) => options.map(({ id }) => id)))];
  const variants = await loadVariants(admin, ids);
  return selectors.map((selector) => hydratedSelector(selector, variants, allowMissing));
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
  allowMissing: boolean,
): BundleSelectorInput {
  const source = allowMissing ? selector.options.filter(({ id }) => variants.has(id)) : selector.options;
  const nodes = source.map(({ id }) => currentVariant(id, selector.productId, variants));
  nodes.sort((first, second) => first.position - second.position);
  return { ...selector, options: nodes.map(({ id, price }) => ({ id, unitPrice: price })) };
}

function currentVariant(id: string, productId: string, variants: Map<string, VariantNode>): VariantNode {
  const variant = variants.get(id);
  if (!variant || variant.product.id !== productId) invalidComponent("A selected variant no longer exists.");
  if (isBundleVariant(variant)) invalidComponent("Nested bundle components aren't supported.");
  return variant;
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
