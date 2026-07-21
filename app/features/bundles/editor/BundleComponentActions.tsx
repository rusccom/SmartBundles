export interface BundleComponentActionsProps {
  index: number;
  total: number;
  productTitle: string;
  onMove: (index: number, offset: number) => void;
  onRemove: (index: number) => void;
}

export function BundleComponentActions(props: BundleComponentActionsProps) {
  return <footer className="sb-component-actions">
    <button type="button" disabled={props.index === 0} aria-label={`Move ${props.productTitle} up`}
      onClick={() => props.onMove(props.index, -1)}>Move up</button>
    <button type="button" disabled={props.index === props.total - 1} aria-label={`Move ${props.productTitle} down`}
      onClick={() => props.onMove(props.index, 1)}>Move down</button>
    <button type="button" className="critical" aria-label={`Remove ${props.productTitle}`}
      onClick={() => props.onRemove(props.index)}>Remove</button>
  </footer>;
}
