import type { KeyboardEvent } from "react";
import type { ReturnTypeOfDescriptionLink } from "./description-link.types";

export interface DescriptionLinkPanelProps {
  link: ReturnTypeOfDescriptionLink;
}

export function DescriptionLinkPanel({ link }: DescriptionLinkPanelProps) {
  return <div className="sb-description-link-panel" role="group" aria-label="Edit link">
    <label>URL<input type="text" value={link.draft.href} onKeyDown={(event) => handleKeyDown(event, link)} onChange={(event) => link.dispatch({ type: "href", value: event.target.value })} /></label>
    <label>Title (optional)<input type="text" value={link.draft.title} onKeyDown={(event) => handleKeyDown(event, link)} onChange={(event) => link.dispatch({ type: "title", value: event.target.value })} /></label>
    {link.draft.error ? <span className="sb-description-link-error" role="alert">{link.draft.error}</span> : null}
    <div className="sb-description-link-actions">
      <button type="button" onClick={link.apply}>Apply</button>
      {link.active ? <button type="button" onClick={link.remove}>Remove</button> : null}
      <button type="button" onClick={() => link.dispatch({ type: "close" })}>Cancel</button>
    </div>
  </div>;
}

function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, link: ReturnTypeOfDescriptionLink): void {
  if (event.key === "Enter") {
    event.preventDefault();
    link.apply();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    link.dispatch({ type: "close" });
  }
}
