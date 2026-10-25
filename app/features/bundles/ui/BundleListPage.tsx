import { BundleTable } from "./BundleTable";
import { EmptyBundles } from "./EmptyBundles";
import type { BundleListPageProps } from "./bundle-list.types";

export function BundleListPage({
  bundles, plan, activeCount, page, hasNext,
}: BundleListPageProps) {
  const quota = plan === "PRO"
    ? "Pro - Unlimited active bundles"
    : `Free - ${activeCount} of 3 active`;
  return <s-page heading="Bundles">
    <s-button slot="primary-action" variant="primary" href="/app/bundles/new">Create bundle</s-button>
    <s-section heading="Your bundles" padding="none">
      {page > 0 || hasNext ? <s-text slot="accessory" color="subdued">Page {page + 1}</s-text> : null}
      <s-badge slot="supplemental">{quota}</s-badge>
      {bundles.length || page ? <BundleTable bundles={bundles} page={page} hasNext={hasNext} /> : <EmptyBundles />}
    </s-section>
  </s-page>;
}
