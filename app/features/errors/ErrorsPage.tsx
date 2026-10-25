import type { ErrorIncidentStatus } from "@prisma/client";
import { ErrorIncidentCard } from "./ErrorIncidentCard";
import type { ErrorListItem } from "./error-repository.server";

interface ErrorsPageProps { incidents: ErrorListItem[]; status: ErrorIncidentStatus }

export function ErrorsPage({ incidents, status }: ErrorsPageProps) {
  return <s-page heading="Errors">
    <s-stack gap="base">
      <s-paragraph>Repeated errors are grouped. Resolved errors reopen if they occur again. Ignored errors remain recorded.</s-paragraph>
      <s-stack direction="inline" gap="base">
        <s-link href="/app/errors?status=OPEN">Open</s-link>
        <s-link href="/app/errors?status=RESOLVED">Resolved</s-link>
        <s-link href="/app/errors?status=IGNORED">Ignored</s-link>
      </s-stack>
      {!incidents.length ? <s-section><s-paragraph>No {status.toLowerCase()} errors.</s-paragraph></s-section> : null}
      {incidents.map((incident) => <ErrorIncidentCard key={incident.id} incident={incident} />)}
      {incidents.length === 100 ? <s-paragraph>Showing the 100 most recent errors.</s-paragraph> : null}
    </s-stack>
  </s-page>;
}
