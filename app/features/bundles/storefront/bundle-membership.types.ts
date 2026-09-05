import type { BundleSelectorInput } from "../bundle.types";

export interface BundleMembership {
  b: string;
  p: string;
  r: string;
  n: number;
  d: string;
  s: Array<{ k: number; q: number; d: string }>;
}

export interface BundleMembershipInput {
  publicId: string;
  parentVariantId: string;
  discountPercent: string;
  selectors: BundleSelectorInput[];
  previousSelectors: BundleSelectorInput[];
  enabled: boolean;
}
