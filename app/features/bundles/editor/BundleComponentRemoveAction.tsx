export interface BundleComponentRemoveActionProps {
  index: number;
  productTitle: string;
  onRemove: (index: number) => void;
}

export function BundleComponentRemoveAction(props: BundleComponentRemoveActionProps) {
  const label = `Remove ${props.productTitle}`;
  return <div className="sb-component-remove-action">
    <button type="button" aria-label={label} title={label}
      onClick={() => props.onRemove(props.index)}><span aria-hidden="true">×</span></button>
  </div>;
}
