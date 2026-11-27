import type { ErrorIncidentStatus } from "@prisma/client";
import { useFetcher } from "react-router";
import type { ErrorListItem } from "./error-repository.server";

export function ErrorIncidentActions({ incident }: { incident: ErrorListItem }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";
  const submit = (status: ErrorIncidentStatus) =>
    void fetcher.submit({ id: incident.id, status }, { method: "post" });
  return <s-stack direction="inline" gap="small">
    {incident.status === "OPEN"
      ? <s-button disabled={busy} onClick={() => submit("RESOLVED")}>Mark resolved</s-button>
      : <s-button disabled={busy} onClick={() => submit("OPEN")}>Reopen</s-button>}
    {incident.status !== "IGNORED"
      ? <s-button variant="tertiary" disabled={busy} onClick={() => submit("IGNORED")}>Ignore</s-button>
      : null}
  </s-stack>;
}
