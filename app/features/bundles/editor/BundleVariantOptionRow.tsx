import type { EditorOption } from "./editor.types";

export interface BundleVariantOptionRowProps {
  option: EditorOption;
  onToggle: (id: string) => void;
}

export function BundleVariantOptionRow({ option, onToggle }: BundleVariantOptionRowProps) {
  return <label className="sb-option">
    <input type="checkbox" checked={option.allowed} onChange={() => onToggle(option.id)} />
    <span>{option.title}{option.available === false ? " · Sold out" : ""}</span>
  </label>;
}
