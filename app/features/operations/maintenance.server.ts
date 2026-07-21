import { enforceConfirmedFreeQuota } from "./free-quota-maintenance.server";
import { runPublicationJobs } from "./reconcile-job-runner.server";
import { runRetentionMaintenance } from "./retention.server";
import { queueProjectionUpgrades } from "./projection-upgrade.server";

export async function runMaintenance() {
  const projectionUpgrades = await queueProjectionUpgrades();
  const publicationJobs = await runPublicationJobs();
  const freeQuota = await enforceConfirmedFreeQuota();
  const retention = await runRetentionMaintenance();
  return { projectionUpgrades, publicationJobs, freeQuota, retention };
}
