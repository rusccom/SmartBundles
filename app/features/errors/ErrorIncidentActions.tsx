import { useFetcher } from "react-router";
import type { ErrorListItem } from "./error-repository.server";

export function ErrorIncidentActions({ incident }: { incident: ErrorListItem }) {
  const fetcher = useFetcher();
  return <fetcher.Form method="post">
    <input type="hidden" name="id" value={incident.id} />
    <s-stack direction="inline" gap="base">
      <button name="status" value={incident.status === "OPEN" ? "RESOLVED" : "OPEN"} disabled={fetcher.state !== "idle"}>
        {incident.status === "OPEN" ? "Mark resolved" : "Reopen"}</button>
      <button name="status" value="IGNORED" disabled={fetcher.state !== "idle"}>Ignore</button>
    </s-stack>
  </fetcher.Form>;
}
