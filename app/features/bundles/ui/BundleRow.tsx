import type { BundleListItem } from "./bundle-list.types";

export interface BundleRowProps { bundle: BundleListItem }

export function BundleRow({ bundle }: BundleRowProps) {
  return <s-table-row>
    <s-table-cell><s-link href={`/app/bundles/${bundle.id}`}>{bundle.title}</s-link></s-table-cell>
    <s-table-cell><s-badge>{bundle.status === "ACTIVE" ? "Active" : "Draft"}</s-badge></s-table-cell>
    <s-table-cell>{bundle.componentCount}</s-table-cell>
    <s-table-cell>{priceLabel(bundle)}</s-table-cell>
    <s-table-cell>{new Date(bundle.updatedAt).toLocaleDateString()}</s-table-cell>
    <s-table-cell><s-link href={`/app/bundles/${bundle.id}`}>Edit</s-link></s-table-cell>
  </s-table-row>;
}

function priceLabel(bundle: BundleListItem): string {
  return bundle.pricingMode === "DYNAMIC" ? "Dynamic" : bundle.fixedPrice ?? "—";
}
