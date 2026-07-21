export interface BundleComponentRemoveActionProps {
  index: number;
  productTitle: string;
  onRemove: (index: number) => void;
}

export function BundleComponentRemoveAction(props: BundleComponentRemoveActionProps) {
  return <footer className="sb-component-remove-action">
    <button type="button" className="critical" aria-label={`Remove ${props.productTitle}`}
      onClick={() => props.onRemove(props.index)}>Remove</button>
  </footer>;
}
