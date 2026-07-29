export interface BundleListItem {
  id: string;
  title: string;
  pricingMode: "FIXED" | "DYNAMIC";
  fixedPrice: string | null;
  status: "DRAFT" | "ACTIVE";
  componentCount: number;
  updatedAt: string;
  parentProductGid: string;
}

export interface BundleListPageProps {
  bundles: BundleListItem[];
  plan: "FREE" | "PRO";
  activeCount: number;
  page: number;
  hasNext: boolean;
}
