import type { ErrorIncidentStatus } from "@prisma/client";
import { ErrorIncidentCard } from "./ErrorIncidentCard";
import type { ErrorListItem } from "./error-repository.server";

interface ErrorsPageProps { incidents: ErrorListItem[]; status: ErrorIncidentStatus; locale: string }

const FILTERS: Array<[ErrorIncidentStatus, string]> = [["OPEN", "Open"], ["RESOLVED", "Resolved"], ["IGNORED", "Ignored"]];

export function ErrorsPage({ incidents, status, locale }: ErrorsPageProps) {
  return <s-page heading="Errors">
    <s-stack gap="base">
      <s-paragraph>Repeated errors are grouped. Resolved errors reopen if they occur again. Ignored errors remain recorded.</s-paragraph>
      <s-stack direction="inline" gap="small">
        {FILTERS.map(([value, label]) => <s-button key={value} href={`/app/errors?status=${value}`}
          variant={value === status ? "primary" : "secondary"}>{label}</s-button>)}
      </s-stack>
      {!incidents.length ? <s-section><s-paragraph>No {status.toLowerCase()} errors.</s-paragraph></s-section> : null}
      {incidents.map((incident) => <ErrorIncidentCard key={incident.id} incident={incident} locale={locale} />)}
      {incidents.length === 100 ? <s-paragraph color="subdued">Showing the 100 most recent errors.</s-paragraph> : null}
    </s-stack>
  </s-page>;
}
