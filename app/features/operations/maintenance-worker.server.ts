import { enforceConfirmedFreeQuota } from "./free-quota-maintenance.server";
import { runRetentionMaintenance } from "./retention.server";

const INITIAL_DELAY_MS = 5_000;
const QUOTA_INTERVAL_MS = 60 * 60_000;
const RETENTION_INTERVAL_MS = 24 * 60 * 60_000;

interface MaintenanceGlobal {
  __smartBundleMaintenanceWorkerStarted?: boolean;
}

const maintenanceGlobal = globalThis as typeof globalThis & MaintenanceGlobal;
const running = new Set<string>();

export function startMaintenanceWorker(): void {
  if (!workerEnabled() || maintenanceGlobal.__smartBundleMaintenanceWorkerStarted) return;
  maintenanceGlobal.__smartBundleMaintenanceWorkerStarted = true;
  startTimers();
}

function workerEnabled(): boolean {
  return process.env.NODE_ENV === "production" && process.env.MAINTENANCE_WORKER_DISABLED !== "1";
}

function startTimers(): void {
  schedule("quota", enforceConfirmedFreeQuota, INITIAL_DELAY_MS, QUOTA_INTERVAL_MS);
  schedule("retention", runRetentionMaintenance, INITIAL_DELAY_MS, RETENTION_INTERVAL_MS);
}

function schedule(
  name: string,
  operation: () => Promise<unknown>,
  initialDelay: number,
  intervalMs: number,
): void {
  const initial = setTimeout(() => void runWorker(name, operation), initialDelay);
  const interval = setInterval(() => void runWorker(name, operation), intervalMs);
  initial.unref();
  interval.unref();
}

async function runWorker(name: string, operation: () => Promise<unknown>): Promise<void> {
  if (running.has(name)) return;
  running.add(name);
  try {
    await operation();
  } catch (error) {
    console.error(`[maintenance-worker] ${name} failed.`, error);
  } finally {
    running.delete(name);
  }
}
