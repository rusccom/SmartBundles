import prisma from "../../db.server";

const RETENTION_DAYS = 30;
const DELETE_BATCH = 500;

export interface RetentionSummary {
  webhooks: number;
  sessions: number;
}

export async function runRetentionMaintenance(): Promise<RetentionSummary> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60_000);
  const onlineCutoff = new Date(now.getTime() - 24 * 60 * 60_000);
  const [webhooks, sessions] = await Promise.all([
    deleteWebhookDeliveries(cutoff),
    deleteExpiredSessions(onlineCutoff, now),
  ]);
  return { webhooks, sessions };
}

async function deleteWebhookDeliveries(cutoff: Date): Promise<number> {
  const records = await prisma.webhookDelivery.findMany({
    where: { state: { in: ["PROCESSED", "FAILED"] }, updatedAt: { lt: cutoff } },
    select: { id: true },
    take: DELETE_BATCH,
  });
  if (!records.length) return 0;
  const ids = records.map(({ id }) => id);
  return (await prisma.webhookDelivery.deleteMany({ where: { id: { in: ids } } })).count;
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
  const ids = records.map(({ id }) => id);
  return (await prisma.session.deleteMany({ where: { id: { in: ids } } })).count;
}
