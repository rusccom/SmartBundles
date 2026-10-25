import type { ErrorIncidentStatus } from "@prisma/client";
import prisma from "../../db.server";

export async function listErrorIncidents(shopId: string, status: ErrorIncidentStatus) {
  const incidents = await prisma.errorIncident.findMany({
    where: { shopId, status }, orderBy: { lastSeenAt: "desc" }, take: 100,
    select: { id: true, code: true, source: true, severity: true, message: true, context: true,
      status: true, occurrences: true, firstSeenAt: true, lastSeenAt: true },
  });
  return incidents.map((incident) => ({
    ...incident, firstSeenAt: incident.firstSeenAt.toISOString(), lastSeenAt: incident.lastSeenAt.toISOString(),
  }));
}

export function setErrorIncidentStatus(shopId: string, id: string, status: ErrorIncidentStatus) {
  return prisma.errorIncident.updateMany({
    where: { id, shopId }, data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
  });
}

export function errorStatus(value: unknown): ErrorIncidentStatus | undefined {
  if (value === "OPEN" || value === "RESOLVED" || value === "IGNORED") return value;
  return undefined;
}

export type ErrorListItem = Awaited<ReturnType<typeof listErrorIncidents>>[number];
