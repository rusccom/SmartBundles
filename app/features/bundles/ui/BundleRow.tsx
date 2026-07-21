import type { BundleListItem } from "./bundle-list.types";

export interface BundleRowProps { bundle: BundleListItem }

export function BundleRow({ bundle }: BundleRowProps) {
  return <s-table-row>
    <s-table-cell><s-link href={`/app/bundles/${bundle.id}`}>{bundle.title}</s-link></s-table-cell>
    <s-table-cell><s-badge>{bundle.status.replaceAll("_", " ")}</s-badge></s-table-cell>
    <s-table-cell><s-badge>{bundle.health.replaceAll("_", " ")}</s-badge></s-table-cell>
    <s-table-cell>{bundle.componentCount}</s-table-cell>
    <s-table-cell>{bundle.price}</s-table-cell>
    <s-table-cell>{new Date(bundle.updatedAt).toLocaleDateString()}</s-table-cell>
    <s-table-cell><s-link href={`/app/bundles/${bundle.id}`}>Edit</s-link></s-table-cell>
  </s-table-row>;
}
