export interface BundleEditorProductActionsProps {
  productGid: string;
  storefrontUrl: string | null;
}

export function BundleEditorProductActions(props: BundleEditorProductActionsProps) {
  return <>
    <s-button slot="secondary-actions" href={adminProductUrl(props.productGid)} target="_top">
      Edit product on Shopify
    </s-button>
    <s-button slot="secondary-actions" href={props.storefrontUrl ?? undefined}
      target="_blank" disabled={!props.storefrontUrl}
      accessibilityLabel="View on store (opens in a new tab)">
      View on store
    </s-button>
  </>;
}

function adminProductUrl(productGid: string): string {
  const productId = productGid.slice(productGid.lastIndexOf("/") + 1);
  return `shopify://admin/products/${productId}`;
}
