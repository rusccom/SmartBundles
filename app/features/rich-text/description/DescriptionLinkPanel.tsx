import { useEffect, useRef } from "react";
import type { ReturnTypeOfDescriptionLink } from "./description-link.types";

export interface DescriptionLinkPanelProps {
  link: ReturnTypeOfDescriptionLink;
}

export function DescriptionLinkPanel({ link }: DescriptionLinkPanelProps) {
  const panel = useLinkKeyboard(link);
  return <div ref={panel} role="group" aria-label="Edit link">
    <s-stack gap="base" padding="base">
      <s-text-field label="URL" value={link.draft.href} error={link.draft.error}
        onInput={(event) => link.dispatch({ type: "href", value: event.currentTarget.value })} />
      <s-text-field label="Title (optional)" value={link.draft.title}
        onInput={(event) => link.dispatch({ type: "title", value: event.currentTarget.value })} />
      <s-stack direction="inline" gap="small" justifyContent="end">
        <s-button onClick={() => link.dispatch({ type: "close" })}>Cancel</s-button>
        {link.active ? <s-button onClick={link.remove}>Remove link</s-button> : null}
        <s-button variant="primary" onClick={link.apply}>Apply</s-button>
      </s-stack>
    </s-stack>
  </div>;
}

function useLinkKeyboard(link: ReturnTypeOfDescriptionLink) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = panel.current;
    const handle = (event: KeyboardEvent) => handleKeyDown(event, link);
    node?.addEventListener("keydown", handle);
    return () => node?.removeEventListener("keydown", handle);
  }, [link]);
  return panel;
}

function handleKeyDown(event: KeyboardEvent, link: ReturnTypeOfDescriptionLink): void {
  if (event.key === "Enter" && (event.target as HTMLElement).closest("s-text-field")) {
    event.preventDefault();
    link.apply();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    link.dispatch({ type: "close" });
  }
}
