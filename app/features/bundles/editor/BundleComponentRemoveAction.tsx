export interface BundleComponentRemoveActionProps {
  index: number;
  productTitle: string;
  onRemove: (index: number) => void;
}

export function BundleComponentRemoveAction(props: BundleComponentRemoveActionProps) {
  const label = `Remove ${props.productTitle}`;
  return <div className="sb-component-remove-action">
    <s-button variant="tertiary" tone="critical" icon="x"
      accessibilityLabel={label} onClick={() => props.onRemove(props.index)} />
  </div>;
}
