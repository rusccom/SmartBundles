import type { ShopifyProductImage } from "../content/content.types";

export type BundleMediaDraft =
  | { kind: "keep"; image: ShopifyProductImage | null }
  | { kind: "remove"; image: null }
  | { kind: "component"; image: ShopifyProductImage; productId: string }
  | { kind: "upload"; image: ShopifyProductImage; file: File };

export interface BundleMediaCandidate {
  productId: string;
  title: string;
  url: string;
}
