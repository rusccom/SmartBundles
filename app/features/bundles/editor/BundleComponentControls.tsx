import { BundleComponentDiscountField } from "./BundleComponentDiscountField";
import { BundleComponentQuantityField } from "./BundleComponentQuantityField";
import type { EditorSelector } from "./editor.types";

export interface BundleComponentControlsProps {
  selector: EditorSelector;
  discountDisabled: boolean;
  onQuantity: (quantity: number) => void;
  onDiscount: (discountPercent: string) => void;
}

export function BundleComponentControls(props: BundleComponentControlsProps) {
  return <div className="sb-component-controls">
    <BundleComponentQuantityField quantity={props.selector.quantity} onChange={props.onQuantity} />
    <BundleComponentDiscountField value={props.selector.discountPercent}
      disabled={props.discountDisabled} onChange={props.onDiscount} />
  </div>;
}
