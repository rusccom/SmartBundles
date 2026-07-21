import { useEffect } from "react";
import type { DescriptionControlProps } from "./description-editor.types";
import { DescriptionLinkPanel } from "./DescriptionLinkPanel";
import { DescriptionToolbarButton } from "./DescriptionToolbarButton";
import { useDescriptionLink } from "./useDescriptionLink";

export function DescriptionLinkControl({ editor, disabled }: DescriptionControlProps) {
  const link = useDescriptionLink(editor);
  const linkOpen = link.draft.open;
  const { dispatch } = link;
  useEffect(() => {
    if (disabled && linkOpen) dispatch({ type: "close" });
  }, [disabled, dispatch, linkOpen]);
  return <div className="sb-description-link-control">
    <DescriptionToolbarButton label="Edit link" content="Link" pressed={link.active || link.draft.open} disabled={disabled || !editor} onPress={link.toggle} />
    {linkOpen && !disabled ? <DescriptionLinkPanel link={link} /> : null}
  </div>;
}
