export interface ShopifyProductContent {
  title: string;
  descriptionHtml: string;
  price: string;
  compareAtPrice: string | null;
}

export interface ShopifyProductSummary {
  title: string;
  price: string | null;
  compareAtPrice: string | null;
}

export interface CreationTokenPayload {
  v: 1;
  kind: "create";
  shopDomain: string;
  publicId: string;
}

export interface ParentProductContentInput {
  publicId: string;
  title: string;
  descriptionHtml: string;
}

export interface BundleTitleTarget {
  parentProductGid: string;
  publicId: string;
}
