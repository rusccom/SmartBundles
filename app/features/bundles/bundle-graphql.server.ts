export const CREATE_PRODUCT = `#graphql
  mutation SmartBundleCreateProduct($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        variants(first: 1) { nodes { id } }
      }
      userErrors { message }
    }
  }
`;

export const FIND_PARENT_PRODUCT = `#graphql
  query SmartBundleFindParent($identifier: ProductIdentifierInput!) {
    product: productByIdentifier(identifier: $identifier) {
      id
      variants(first: 2) { nodes { id } }
      bundleId: metafield(namespace: "$app", key: "bundle_id") { value }
    }
  }
`;

export const UPDATE_VARIANT = `#graphql
  mutation SmartBundleUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { message }
    }
  }
`;

export const SET_METAFIELDS = `#graphql
  mutation SmartBundleSetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { message }
    }
  }
`;

export const UPDATE_PRODUCT = `#graphql
  mutation SmartBundleUpdateProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      userErrors { message }
    }
  }
`;

export const PUBLISH_PRODUCT = `#graphql
  mutation SmartBundlePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { message }
    }
  }
`;

export const UNPUBLISH_PRODUCT = `#graphql
  mutation SmartBundleUnpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) {
      userErrors { message }
    }
  }
`;

export const READ_PRODUCT_CONTENT = `#graphql
  query SmartBundleReadProductContent($id: ID!) {
    product(id: $id) {
      title descriptionHtml onlineStoreUrl onlineStorePreviewUrl
      media(first: 1, query: "media_type:IMAGE", sortKey: POSITION) {
        nodes { ... on MediaImage { image { url altText width height } } }
      }
      variants(first: 1) { nodes { id price compareAtPrice } }
      identity: metafield(namespace: "$app", key: "bundle_id") { value }
    }
  }
`;

export const READ_PRODUCT_TITLES = `#graphql
  query SmartBundleReadProductTitles($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id title
        variants(first: 1) { nodes { price compareAtPrice } }
        identity: metafield(namespace: "$app", key: "bundle_id") { value }
      }
    }
  }
`;
