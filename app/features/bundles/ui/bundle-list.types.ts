export interface BundleListItem {
  id: string;
  title: string;
  price: string;
  status: string;
  health: string;
  componentCount: number;
  updatedAt: string;
  parentProductGid: string | null;
}

export interface BundleListPageProps {
  bundles: BundleListItem[];
  plan: "FREE" | "PRO";
  activeCount: number;
  page: number;
  hasNext: boolean;
}
