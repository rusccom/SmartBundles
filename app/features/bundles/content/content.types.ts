export interface ShopifyProductContent {
  title: string;
  descriptionHtml: string;
  image: ShopifyProductImage | null;
  price: string;
  compareAtPrice: string | null;
  onlineStoreUrl: string | null;
  onlineStorePreviewUrl: string | null;
}

export interface ShopifyProductImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
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
