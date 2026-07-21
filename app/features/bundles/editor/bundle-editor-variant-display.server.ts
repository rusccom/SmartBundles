import type { BundleSelectorInput } from "../bundle.types";
import type { AdminClient } from "../../shopify/admin-api.server";
import { adminRequest } from "../../shopify/admin-api.server";
import type { EditorSelector } from "./editor.types";

const PRODUCT_BATCH_SIZE = 10;

const SHOP_CURRENCY_QUERY = `#graphql
  query BundleEditorShopCurrency { shop { currencyCode } }
`;

const PRODUCTS_QUERY = `#graphql
  query BundleEditorProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        featuredMedia { preview { image { url } } }
        variants(first: 50) {
          nodes { id title price availableForSale image { url } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`;

const PRODUCT_VARIANTS_QUERY = `#graphql
  query BundleEditorProductVariants($id: ID!, $after: String) {
    product(id: $id) {
      variants(first: 50, after: $after) {
        nodes { id title price availableForSale image { url } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

interface ShopCurrencyQuery { shop: { currencyCode: string } }
interface VariantNode {
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
  image?: { url: string } | null;
}
interface VariantConnection {
  nodes: VariantNode[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}
interface ProductNode {
  id: string;
  title: string;
  featuredMedia?: { preview?: { image?: { url: string } | null } | null } | null;
  variants: VariantConnection;
}
interface ProductsQuery { nodes: Array<ProductNode | null> }
interface ProductVariantsQuery { product?: { variants: VariantConnection } | null }
interface EditorProduct { id: string; title: string; imageUrl?: string; variants: VariantNode[] }

export async function hydrateEditorSelectors(admin: AdminClient, selectors: BundleSelectorInput[]) {
  const productIds = [...new Set(selectors.map(({ productId }) => productId))];
  const [currencyCode, products] = await Promise.all([
    loadShopCurrencyCode(admin),
    loadProducts(admin, productIds),
  ]);
  return { currencyCode, selectors: selectors.map((selector) => hydrateSelector(selector, products)) };
}

export async function loadShopCurrencyCode(admin: AdminClient): Promise<string> {
  const result = await adminRequest<ShopCurrencyQuery>(admin, SHOP_CURRENCY_QUERY);
  return result.shop.currencyCode;
}

async function loadProducts(admin: AdminClient, ids: string[]): Promise<Map<string, EditorProduct>> {
  const products = new Map<string, EditorProduct>();
  for (let index = 0; index < ids.length; index += PRODUCT_BATCH_SIZE) {
    const result = await adminRequest<ProductsQuery>(admin, PRODUCTS_QUERY, { ids: ids.slice(index, index + PRODUCT_BATCH_SIZE) });
    const completed = await Promise.all(result.nodes.flatMap((node) => node ? [completeProduct(admin, node)] : []));
    completed.forEach((product) => products.set(product.id, product));
  }
  return products;
}

async function completeProduct(admin: AdminClient, product: ProductNode): Promise<EditorProduct> {
  const variants = [...product.variants.nodes];
  let cursor = nextCursor(product.variants);
  while (cursor) {
    const result = await adminRequest<ProductVariantsQuery>(admin, PRODUCT_VARIANTS_QUERY, { id: product.id, after: cursor });
    const connection = result.product?.variants;
    if (!connection) throw new Error("A component product no longer exists.");
    variants.push(...connection.nodes);
    cursor = nextCursor(connection);
  }
  return { id: product.id, title: product.title, imageUrl: product.featuredMedia?.preview?.image?.url, variants };
}

function hydrateSelector(selector: BundleSelectorInput, products: Map<string, EditorProduct>): EditorSelector {
  const product = products.get(selector.productId);
  if (!product) return missingProductSelector(selector);
  const allowedIds = new Set(selector.options.map(({ id }) => id));
  return {
    ...selector,
    productTitle: product.title,
    options: product.variants.map((variant) => editorOption(variant, allowedIds.has(variant.id), product.imageUrl)),
  };
}

function missingProductSelector(selector: BundleSelectorInput): EditorSelector {
  return {
    ...selector,
    options: selector.options.map((option) => ({ ...option, available: false, allowed: true })),
  };
}

function editorOption(variant: VariantNode, allowed: boolean, defaultImageUrl?: string) {
  return {
    id: variant.id,
    title: variant.title,
    imageUrl: variant.image?.url ?? defaultImageUrl,
    available: variant.availableForSale,
    unitPrice: variant.price,
    allowed,
  };
}

function nextCursor(connection: VariantConnection): string | undefined {
  return connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor ?? undefined : undefined;
}
