import type { BundleContentSubmission } from "../bundle.types";

export interface ShopifyProductContent {
  productId: string;
  title: string;
  descriptionHtml: string;
  updatedAt: string;
  bundlePublicId: string | null;
}

export interface ContentVersionPayload {
  v: 1;
  kind: "content";
  shopDomain: string;
  bundleId: string;
  productId: string;
  lockVersion: number;
  titleHash: string;
  descriptionHash: string;
  updatedAt: string;
}

export interface CreationTokenPayload {
  v: 1;
  kind: "create";
  shopDomain: string;
  publicId: string;
}

export interface ContentTokenSource {
  shopDomain: string;
  bundleId: string;
  lockVersion: number;
  content: ShopifyProductContent;
}

export interface ContentTokenIdentity {
  shopDomain: string;
  bundleId: string;
  productId: string;
  publicId: string;
  lockVersion: number;
}

export interface ProductContentPatch {
  title?: string;
  descriptionHtml?: string;
}

export interface ContentSyncInput {
  identity: ContentTokenIdentity;
  submission: BundleContentSubmission;
  assertBundleVersion: () => Promise<void>;
  beforeMutation: () => Promise<void>;
}

export interface ParentProductContentInput {
  publicId: string;
  title: string;
  descriptionHtml: string;
}

export interface BundleTitleTarget {
  parentProductGid: string | null;
  publicId: string;
}
