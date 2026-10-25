import { useEffect, useId, useRef } from "react";
import type { DescriptionControlProps } from "./description-editor.types";
import { DescriptionLinkPanel } from "./DescriptionLinkPanel";
import { useDescriptionLink } from "./useDescriptionLink";

export function DescriptionLinkControl({ editor, disabled }: DescriptionControlProps) {
  const link = useDescriptionLink(editor);
  const id = useId();
  const dismiss = useRef<HTMLElementTagNameMap["s-button"]>(null);
  useEffect(() => {
    if (disabled || !link.draft.open) dismiss.current?.click();
  }, [disabled, link.draft.open]);
  return <>
    <s-button variant="tertiary" icon="link" accessibilityLabel="Edit link"
      disabled={disabled || !editor} commandFor={id}>Link</s-button>
    <span hidden><s-button ref={dismiss} commandFor={id} command="--hide" accessibilityLabel="Close link editor" /></span>
    <s-popover id={id} onShow={link.open}
      onHide={() => link.dispatch({ type: "close" })} maxInlineSize="340px">
      <DescriptionLinkPanel link={link} />
    </s-popover>
  </>;
}
