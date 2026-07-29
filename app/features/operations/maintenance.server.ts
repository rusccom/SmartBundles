import { enforceConfirmedFreeQuota } from "./free-quota-maintenance.server";
import { runRetentionMaintenance } from "./retention.server";

export async function runMaintenance() {
  const [freeQuota, retention] = await Promise.all([
    enforceConfirmedFreeQuota(),
    runRetentionMaintenance(),
  ]);
  return { freeQuota, retention };
}
