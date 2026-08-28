import type { BundleMediaCandidate } from "./bundle-media.types";
import type { EditorSelector } from "./editor.types";

export function bundleMediaCandidates(selectors: EditorSelector[]): BundleMediaCandidate[] {
  const seen = new Set<string>();
  return selectors.flatMap((selector) => {
    if (!selector.productImageUrl || seen.has(selector.productId)) return [];
    seen.add(selector.productId);
    return [{
      productId: selector.productId,
      title: selector.productTitle,
      url: selector.productImageUrl,
    }];
  });
}
