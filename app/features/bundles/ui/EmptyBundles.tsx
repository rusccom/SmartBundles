export function EmptyBundles({ page = 0 }: { page?: number }) {
  return <s-empty-state heading={page ? "No bundles on this page" : "Create your first customizable bundle"}>
    <s-icon slot="graphic" type="product" />
    <s-text slot="subheading">{page ? "Return to the first page to find your bundles."
      : "Choose components and decide which variants customers can select."}</s-text>
    <s-button slot="primary-action" variant="primary" href={page ? "/app/bundles" : "/app/bundles/new"}>
      {page ? "Back to bundles" : "Create bundle"}
    </s-button>
  </s-empty-state>;
}
