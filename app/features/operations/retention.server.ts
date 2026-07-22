import prisma from "../../db.server";
import { PRICING_MINIMUM_JOB_PREFIX } from "./projection-upgrade.server";

const RETENTION_DAYS = 30;
const RETAIN_REVISIONS = 20;
const DELETE_BATCH = 500;

export interface RetentionSummary {
  webhooks: number;
  jobs: number;
  outbox: number;
  sessions: number;
  revisions: number;
}

export async function runRetentionMaintenance(): Promise<RetentionSummary> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60_000);
  const sessionCutoff = new Date(now.getTime() - 24 * 60 * 60_000);
  const [webhooks, jobs, outbox, sessions, revisions] = await Promise.all([
    deleteWebhookDeliveries(cutoff),
    deletePublicationJobs(cutoff),
    deleteOutboxEvents(cutoff),
    deleteExpiredSessions(sessionCutoff, now),
    pruneBundleRevisions(cutoff),
  ]);
  return { webhooks, jobs, outbox, sessions, revisions };
}

async function deleteWebhookDeliveries(cutoff: Date): Promise<number> {
  const records = await prisma.webhookDelivery.findMany({
    where: { state: { in: ["PROCESSED", "FAILED"] }, updatedAt: { lt: cutoff } },
    select: { id: true }, take: DELETE_BATCH,
  });
  if (!records.length) return 0;
  return (await prisma.webhookDelivery.deleteMany({
    where: { id: { in: records.map(({ id }) => id) } },
  })).count;
}

async function deletePublicationJobs(cutoff: Date): Promise<number> {
  const records = await prisma.publicationJob.findMany({
    where: {
      state: { in: ["COMPLETED", "FAILED"] },
      updatedAt: { lt: cutoff },
      NOT: { idempotencyKey: { startsWith: PRICING_MINIMUM_JOB_PREFIX } },
    },
    select: { id: true }, take: DELETE_BATCH,
  });
  if (!records.length) return 0;
  return (await prisma.publicationJob.deleteMany({
    where: { id: { in: records.map(({ id }) => id) } },
  })).count;
}

async function deleteOutboxEvents(cutoff: Date): Promise<number> {
  const records = await prisma.outboxEvent.findMany({
    where: { deliveredAt: { lt: cutoff } }, select: { id: true }, take: DELETE_BATCH,
  });
  if (!records.length) return 0;
  return (await prisma.outboxEvent.deleteMany({
    where: { id: { in: records.map(({ id }) => id) } },
  })).count;
}

async function deleteExpiredSessions(onlineCutoff: Date, now: Date): Promise<number> {
  const records = await prisma.session.findMany({
    where: {
      OR: [
        { isOnline: true, expires: { lt: onlineCutoff } },
        { isOnline: false, refreshTokenExpires: { lt: now } },
      ],
    },
    select: { id: true },
    take: DELETE_BATCH,
  });
  if (!records.length) return 0;
  return (await prisma.session.deleteMany({
    where: { id: { in: records.map(({ id }) => id) } },
  })).count;
}

function pruneBundleRevisions(cutoff: Date): Promise<number> {
  return prisma.$executeRaw`
    WITH ranked AS (
      SELECT revision."id", revision."createdAt", ROW_NUMBER() OVER (
        PARTITION BY revision."bundleId" ORDER BY revision."revision" DESC
      ) AS rank
      FROM "BundleRevision" revision
      JOIN "Bundle" bundle ON bundle."id" = revision."bundleId"
      WHERE revision."revision" IS DISTINCT FROM bundle."activeRevision"
        AND revision."revision" IS DISTINCT FROM bundle."draftRevision"
    ), victims AS (
      SELECT "id" FROM ranked
      WHERE rank > ${RETAIN_REVISIONS} OR "createdAt" < ${cutoff}
      ORDER BY "createdAt" ASC
      LIMIT ${DELETE_BATCH}
    )
    DELETE FROM "BundleRevision"
    WHERE "id" IN (SELECT "id" FROM victims)
  `;
}
