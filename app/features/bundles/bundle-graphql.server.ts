export const CREATE_PRODUCT = `#graphql
  mutation SmartBundleCreateProduct($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id title descriptionHtml updatedAt
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
      title
      descriptionHtml
      updatedAt
      variants(first: 2) { nodes { id } }
      bundleId: metafield(namespace: "$app", key: "bundle_id") { value }
    }
  }
`;

export const UPDATE_VARIANT = `#graphql
  mutation SmartBundleUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id requiresComponents price }
      userErrors { message }
    }
  }
`;

export const SET_METAFIELDS = `#graphql
  mutation SmartBundleSetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id key compareDigest value }
      userErrors { message }
    }
  }
`;

export const UPDATE_PRODUCT = `#graphql
  mutation SmartBundleUpdateProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id }
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

export const READ_PRODUCT = `#graphql
  query SmartBundleReadback($id: ID!, $publicationId: ID!) {
    product(id: $id) {
      id
      status
      publishedOnPublication(publicationId: $publicationId)
      variants(first: 2) { nodes { id requiresComponents price } }
      bundleId: metafield(namespace: "$app", key: "bundle_id") { value }
      runtime: metafield(namespace: "$app", key: "bundle_runtime") {
        id value compareDigest
      }
      presentation: metafield(namespace: "$app", key: "bundle_presentation") {
        id value compareDigest
      }
    }
  }
`;

export const READ_PRODUCT_CONTENT = `#graphql
  query SmartBundleReadProductContent($id: ID!) {
    product(id: $id) {
      id title descriptionHtml updatedAt
      identity: metafield(namespace: "$app", key: "bundle_id") { value }
    }
  }
`;

export const READ_PRODUCT_TITLES = `#graphql
  query SmartBundleReadProductTitles($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id title
        identity: metafield(namespace: "$app", key: "bundle_id") { value }
      }
    }
  }
`;
