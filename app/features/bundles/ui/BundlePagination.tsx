export interface BundlePaginationProps {
  page: number;
  hasNext: boolean;
}

export function BundlePagination({ page, hasNext }: BundlePaginationProps) {
  if (!page && !hasNext) return null;
  return <s-stack direction="inline" gap="base">
    {page > 0 ? <s-link href={pageUrl(page - 1)}>Previous</s-link> : null}
    <s-text>Page {page + 1}</s-text>
    {hasNext ? <s-link href={pageUrl(page + 1)}>Next</s-link> : null}
  </s-stack>;
}

function pageUrl(page: number): string {
  return page ? `/app/bundles?page=${page}` : "/app/bundles";
}
