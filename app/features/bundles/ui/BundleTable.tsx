import { BundleRow } from "./BundleRow";
import type { BundleListItem } from "./bundle-list.types";

export interface BundleTableProps { bundles: BundleListItem[] }

export function BundleTable({ bundles }: BundleTableProps) {
  return <s-table>
    <s-table-header-row>
      <s-table-header listSlot="primary">Bundle</s-table-header>
      <s-table-header listSlot="secondary">Lifecycle</s-table-header>
      <s-table-header listSlot="secondary">Health</s-table-header>
      <s-table-header listSlot="labeled" format="numeric">Components</s-table-header>
      <s-table-header listSlot="labeled" format="currency">Price</s-table-header>
      <s-table-header listSlot="secondary">Updated</s-table-header>
      <s-table-header listSlot="inline">Actions</s-table-header>
    </s-table-header-row>
    <s-table-body>{bundles.map((bundle) => <BundleRow key={bundle.id} bundle={bundle} />)}</s-table-body>
  </s-table>;
}
