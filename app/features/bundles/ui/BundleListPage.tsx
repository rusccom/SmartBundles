import { BundlePagination } from "./BundlePagination";
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
    <s-link slot="primary-action" href="/app/bundles/new">Create bundle</s-link>
    <s-section>
      <s-stack direction="block" gap="base">
        <s-badge>{quota}</s-badge>
        {bundles.length ? <BundleTable bundles={bundles} /> : <EmptyBundles />}
        <BundlePagination page={page} hasNext={hasNext} />
      </s-stack>
    </s-section>
  </s-page>;
}
