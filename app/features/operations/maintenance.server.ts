import { enforceConfirmedFreeQuota } from "./free-quota-maintenance.server";
import { runPublicationJobs } from "./reconcile-job-runner.server";
import { runRetentionMaintenance } from "./retention.server";

export async function runMaintenance() {
  const publicationJobs = await runPublicationJobs();
  const freeQuota = await enforceConfirmedFreeQuota();
  const retention = await runRetentionMaintenance();
  return { publicationJobs, freeQuota, retention };
}
