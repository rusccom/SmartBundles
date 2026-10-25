import { ErrorIncidentActions } from "./ErrorIncidentActions";
import type { ErrorListItem } from "./error-repository.server";
import type { ErrorContext } from "./error.types";

export function ErrorIncidentCard({ incident }: { incident: ErrorListItem }) {
  const context = incident.context as ErrorContext;
  return <s-section heading={incident.code}>
    <s-stack gap="base">
      <s-paragraph>{incident.message}</s-paragraph>
      <s-paragraph color="subdued">{incident.source} · {incident.occurrences} occurrences · {incident.lastSeenAt}</s-paragraph>
      {context.bundleId ? <s-link href={`/app/bundles/${context.bundleId}`}>Open affected bundle</s-link> : null}
      <details><summary>Details</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(context, null, 2)}</pre></details>
      <ErrorIncidentActions incident={incident} />
    </s-stack>
  </s-section>;
}
