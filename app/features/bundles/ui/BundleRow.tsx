import { formatDate } from "../../shell/format-date";
import type { BundleListItem } from "./bundle-list.types";

export interface BundleRowProps { bundle: BundleListItem; locale: string }

export function BundleRow({ bundle, locale }: BundleRowProps) {
  const active = bundle.status === "ACTIVE";
  return <s-table-row>
    <s-table-cell><s-link href={`/app/bundles/${bundle.id}`}>{bundle.title}</s-link></s-table-cell>
    <s-table-cell><s-badge tone={active ? "success" : "neutral"}>{active ? "Active" : "Draft"}</s-badge></s-table-cell>
    <s-table-cell>{bundle.componentCount}</s-table-cell>
    <s-table-cell>{priceLabel(bundle)}</s-table-cell>
    <s-table-cell>{formatDate(bundle.updatedAt, locale)}</s-table-cell>
    <s-table-cell><s-link href={`/app/bundles/${bundle.id}`}>Edit</s-link></s-table-cell>
  </s-table-row>;
}

function priceLabel(bundle: BundleListItem): string {
  return bundle.pricingMode === "DYNAMIC" ? "Dynamic" : bundle.fixedPrice ?? "—";
}
