import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "../../db.server";

const WEBHOOK_LEASE_MS = 2 * 60_000;

export interface WebhookInput {
  webhookId: string;
  topic: string;
  shopDomain: string;
  payload: unknown;
}

export type WebhookClaim =
  | { status: "ACQUIRED"; token: string }
  | { status: "PROCESSED" }
  | { status: "IN_FLIGHT" };

export async function claimWebhook(input: WebhookInput): Promise<WebhookClaim> {
  const token = randomUUID();
  const shop = await prisma.shop.findUnique({
    where: { domain: input.shopDomain },
    select: { id: true },
  });
  try {
    await prisma.webhookDelivery.create({
      data: { ...deliveryData(input, shop?.id), attempts: 1, processingToken: token },
    });
    return { status: "ACQUIRED", token };
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    return reclaimWebhook(input.webhookId, token);
  }
}

async function reclaimWebhook(webhookId: string, token: string): Promise<WebhookClaim> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { webhookId },
    select: { state: true, updatedAt: true },
  });
  if (delivery?.state === "PROCESSED") return { status: "PROCESSED" };
  const where = reclaimWhere(webhookId, delivery);
  if (!where) return { status: "IN_FLIGHT" };
  const claimed = await prisma.webhookDelivery.updateMany({
    where,
    data: claimData(token),
  });
  return claimed.count ? { status: "ACQUIRED", token } : currentStatus(webhookId);
}

function reclaimWhere(
  webhookId: string,
  delivery: { state: string; updatedAt: Date } | null,
): Prisma.WebhookDeliveryWhereInput | null {
  if (delivery?.state === "FAILED") return { webhookId, state: "FAILED" };
  const cutoff = new Date(Date.now() - WEBHOOK_LEASE_MS);
  if (delivery?.state !== "PENDING" || delivery.updatedAt > cutoff) return null;
  return { webhookId, state: "PENDING", updatedAt: { lte: cutoff } };
}

function claimData(token: string) {
  return {
    state: "PENDING" as const,
    processingToken: token,
    attempts: { increment: 1 },
    lastError: null,
    updatedAt: new Date(),
  };
}

async function currentStatus(webhookId: string): Promise<WebhookClaim> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { webhookId },
    select: { state: true },
  });
  return { status: delivery?.state === "PROCESSED" ? "PROCESSED" : "IN_FLIGHT" };
}

function deliveryData(input: WebhookInput, shopId?: string) {
  return {
    shopId,
    webhookId: input.webhookId,
    topic: input.topic,
    shopDomain: input.shopDomain,
    payload: safePayload(input.topic, input.payload),
  };
}

function safePayload(topic: string, payload: unknown): Prisma.InputJsonValue {
  if (topic.includes("CUSTOMERS") || topic.includes("REDACT")) return {};
  if (!isRecord(payload)) return {};
  const id = typeof payload.id === "number" || typeof payload.id === "string" ? payload.id : undefined;
  return id === undefined ? {} : { id: String(id) };
}

function isDuplicate(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function renewWebhook(webhookId: string, token: string) {
  return prisma.webhookDelivery.updateMany({
    where: { webhookId, processingToken: token, state: "PENDING" },
    data: { updatedAt: new Date() },
  });
}

export function completeWebhook(webhookId: string, token: string) {
  return prisma.webhookDelivery.updateMany({
    where: { webhookId, processingToken: token, state: "PENDING" },
    data: { state: "PROCESSED", processedAt: new Date(), processingToken: null },
  });
}

export function failWebhook(webhookId: string, token: string, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown webhook error";
  return prisma.webhookDelivery.updateMany({
    where: { webhookId, processingToken: token, state: "PENDING" },
    data: { state: "FAILED", processingToken: null, lastError: message },
  });
}
