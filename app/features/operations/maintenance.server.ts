import { enforceConfirmedFreeQuota } from "./free-quota-maintenance.server";
import { runPublicationJobs } from "./reconcile-job-runner.server";
import { runRetentionMaintenance } from "./retention.server";
import { queueProjectionUpgrades } from "./projection-upgrade.server";
import { queueStorefrontTextDriftSyncs } from "../settings/storefront-text-sync.server";

export async function runMaintenance() {
  const [projectionUpgrades, storefrontTextSyncs] = await Promise.all([
    queueProjectionUpgrades(),
    queueStorefrontTextDriftSyncs(),
  ]);
  const publicationJobs = await runPublicationJobs();
  const freeQuota = await enforceConfirmedFreeQuota();
  const retention = await runRetentionMaintenance();
  return { projectionUpgrades, storefrontTextSyncs, publicationJobs, freeQuota, retention };
}
