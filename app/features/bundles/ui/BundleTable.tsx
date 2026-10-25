import { useNavigate, useNavigation } from "react-router";
import { BundleRow } from "./BundleRow";
import { EmptyBundles } from "./EmptyBundles";
import type { BundleListItem } from "./bundle-list.types";

export interface BundleTableProps { bundles: BundleListItem[]; page: number; hasNext: boolean }

export function BundleTable({ bundles, page, hasNext }: BundleTableProps) {
  const navigate = useNavigate();
  const loading = useNavigation().state !== "idle";
  return <s-table paginate={page > 0 || hasNext} hasPreviousPage={page > 0} hasNextPage={hasNext}
    loading={loading} onPreviousPage={() => void navigate(pageUrl(page - 1))}
    onNextPage={() => void navigate(pageUrl(page + 1))}>
    <s-table-header-row>
      <s-table-header listSlot="primary">Bundle</s-table-header>
      <s-table-header listSlot="secondary">Status</s-table-header>
      <s-table-header listSlot="labeled" format="numeric">Components</s-table-header>
      <s-table-header listSlot="labeled">Pricing</s-table-header>
      <s-table-header listSlot="labeled">Updated</s-table-header>
      <s-table-header listSlot="inline">Actions</s-table-header>
    </s-table-header-row>
    <s-table-body>{bundles.map((bundle) => <BundleRow key={bundle.id} bundle={bundle} />)}<EmptyBundles page={page} /></s-table-body>
  </s-table>;
}

function pageUrl(page: number): string {
  return page > 0 ? `/app/bundles?page=${page}` : "/app/bundles";
}
