import { formatDate } from "../shell/format-date";
import { ErrorIncidentActions } from "./ErrorIncidentActions";
import type { ErrorListItem } from "./error-repository.server";
import type { ErrorContext } from "./error.types";

export function ErrorIncidentCard({ incident, locale }: { incident: ErrorListItem; locale: string }) {
  const context = incident.context as ErrorContext;
  const occurrences = `${incident.occurrences} ${incident.occurrences === 1 ? "occurrence" : "occurrences"}`;
  const error = incident.severity === "error";
  return <s-section heading={incident.code}>
    <s-badge slot="supplemental" tone={error ? "critical" : "warning"}>{error ? "Error" : "Warning"}</s-badge>
    <s-stack gap="base">
      <s-paragraph>{incident.message}</s-paragraph>
      <s-paragraph color="subdued">
        {incident.source} · {occurrences} · Last seen {formatDate(incident.lastSeenAt, locale, true)} UTC
      </s-paragraph>
      {context.bundleId ? <s-link href={`/app/bundles/${context.bundleId}`}>Open affected bundle</s-link> : null}
      <details><summary>Details</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(context, null, 2)}</pre></details>
      <ErrorIncidentActions incident={incident} />
    </s-stack>
  </s-section>;
}
