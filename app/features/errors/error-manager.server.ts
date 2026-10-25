import { createHash } from "node:crypto";
import type { ErrorIncident } from "@prisma/client";
import prisma from "../../db.server";
import { hasErrorSinks, publishError, registerErrorSink } from "./error-sinks.server";
import { safeErrorContext, safeErrorText } from "./error-sanitize";
import type { ErrorContext, ErrorEvent, ErrorReport } from "./error.types";
import { listErrorIncidents, setErrorIncidentStatus } from "./error-repository.server";

const captured = new WeakSet<object>();
const NOTIFY_INTERVAL_MS = 15 * 60_000;

export const errorManager = Object.freeze({
  report, resolve, subscribe: registerErrorSink, list: listErrorIncidents, setStatus: setErrorIncidentStatus,
});

async function report(error: unknown, input: ErrorReport): Promise<ErrorEvent | null> {
  if (error instanceof Error && captured.has(error)) return null;
  try {
    const incident = await storeIncident(error, input);
    if (error instanceof Error) captured.add(error);
    const event = eventFromIncident(incident);
    console.error(JSON.stringify({ event: "smartbundle.error", ...event }));
    await notifyIncident(incident, event);
    return event;
  } catch {
    console.error(JSON.stringify({ code: "ERROR_REPORT_FAILED", originalCode: input.code,
      message: safeErrorText(error instanceof Error ? error.message : String(error)), context: safeErrorContext(input.context) }));
    return null;
  }
}

async function storeIncident(error: unknown, input: ErrorReport): Promise<ErrorIncident> {
  const shopId = await reportShopId(input);
  const context = safeErrorContext({ ...input.context, errorName: error instanceof Error ? error.name : undefined });
  const values = {
    shopId, code: input.code, source: input.source, severity: input.severity ?? "error",
    message: safeErrorText(error instanceof Error ? error.message : String(error)), context: { ...context },
    lastSeenAt: new Date(),
  };
  const fingerprint = incidentFingerprint(shopId, input, context);
  const incident = await prisma.errorIncident.upsert({
    where: { fingerprint }, create: { fingerprint, ...values },
    update: { ...values, occurrences: { increment: 1 } },
  });
  return reopenIncident(incident);
}

async function reportShopId(input: ErrorReport): Promise<string | null> {
  if (input.shopId) return input.shopId;
  if (!input.shopDomain) return null;
  const shop = await prisma.shop.findUnique({ where: { domain: input.shopDomain }, select: { id: true } });
  return shop?.id ?? null;
}

function incidentFingerprint(shopId: string | null, input: ErrorReport, context: ErrorContext): string {
  const resource = context.bundleId ?? context.productId ?? context.operation ?? context.route ?? "";
  return createHash("sha256").update(JSON.stringify([shopId, input.source, input.code, resource])).digest("hex");
}

async function reopenIncident(incident: ErrorIncident): Promise<ErrorIncident> {
  if (incident.status !== "RESOLVED") return incident;
  await prisma.errorIncident.updateMany({
    where: { id: incident.id, status: "RESOLVED" },
    data: { status: "OPEN", resolvedAt: null, lastNotifiedAt: null },
  });
  return { ...incident, status: "OPEN", resolvedAt: null, lastNotifiedAt: null };
}

async function notifyIncident(incident: ErrorIncident, event: ErrorEvent): Promise<void> {
  if (incident.status !== "OPEN" || !hasErrorSinks()) return;
  const cutoff = new Date(Date.now() - NOTIFY_INTERVAL_MS);
  const claimed = await prisma.errorIncident.updateMany({
    where: { id: incident.id, status: "OPEN", OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: cutoff } }] },
    data: { lastNotifiedAt: new Date() },
  });
  if (claimed.count) await publishError(event);
}

async function resolve(shopId: string, code: string, bundleId: string): Promise<void> {
  try {
    await prisma.errorIncident.updateMany({
      where: { shopId, code, status: "OPEN", context: { path: ["bundleId"], equals: bundleId } },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  } catch { console.error(JSON.stringify({ code: "ERROR_RESOLUTION_FAILED" })); }
}

function eventFromIncident(incident: ErrorIncident): ErrorEvent {
  return {
    id: incident.id, code: incident.code, source: incident.source, severity: incident.severity,
    message: incident.message, shopId: incident.shopId, context: incident.context as ErrorContext,
    occurrences: incident.occurrences,
    firstSeenAt: incident.firstSeenAt.toISOString(), lastSeenAt: incident.lastSeenAt.toISOString(),
  };
}
