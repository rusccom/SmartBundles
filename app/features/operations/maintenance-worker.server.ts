import { runMaintenance } from "./maintenance.server";

const INITIAL_DELAY_MS = 5_000;
const INTERVAL_MS = 60_000;

interface MaintenanceGlobal {
  __smartBundleMaintenanceWorkerStarted?: boolean;
}

const maintenanceGlobal = globalThis as typeof globalThis & MaintenanceGlobal;
let running = false;

export function startMaintenanceWorker(): void {
  if (!workerEnabled() || maintenanceGlobal.__smartBundleMaintenanceWorkerStarted) return;
  maintenanceGlobal.__smartBundleMaintenanceWorkerStarted = true;
  startTimers();
}

function workerEnabled(): boolean {
  return process.env.NODE_ENV === "production" && process.env.MAINTENANCE_WORKER_DISABLED !== "1";
}

function startTimers(): void {
  const initial = setTimeout(() => void runWorker(), INITIAL_DELAY_MS);
  const interval = setInterval(() => void runWorker(), INTERVAL_MS);
  initial.unref();
  interval.unref();
}

async function runWorker(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runMaintenance();
  } catch (error) {
    console.error("[maintenance-worker] Maintenance failed.", error);
  } finally {
    running = false;
  }
}
