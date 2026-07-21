import {
  claimWebhook,
  completeWebhook,
  failWebhook,
  renewWebhook,
} from "./webhook-delivery.server";

const HEARTBEAT_MS = 30_000;

export interface ProcessWebhookInput {
  webhookId: string;
  topic: string;
  shop: string;
  payload: unknown;
  handler: () => Promise<void>;
}

export async function processWebhook(input: ProcessWebhookInput): Promise<Response> {
  const claim = await claimWebhook({
    webhookId: input.webhookId,
    topic: input.topic,
    shopDomain: input.shop,
    payload: input.payload,
  });
  if (claim.status === "PROCESSED") return success();
  if (claim.status === "IN_FLIGHT") return retryLater();
  return processClaimed(input, claim.token);
}

async function processClaimed(input: ProcessWebhookInput, token: string): Promise<Response> {
  const timer = startHeartbeat(input.webhookId, token);
  try {
    await input.handler();
    await completeWebhook(input.webhookId, token);
    return success();
  } catch (error) {
    await failWebhook(input.webhookId, token, error);
    return new Response(null, { status: 500 });
  } finally {
    clearInterval(timer);
  }
}

function startHeartbeat(webhookId: string, token: string): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    void renewWebhook(webhookId, token).catch(() => undefined);
  }, HEARTBEAT_MS);
  timer.unref();
  return timer;
}

function success(): Response {
  return new Response(null, { status: 200 });
}

function retryLater(): Response {
  return new Response(null, { status: 503, headers: { "Retry-After": "5" } });
}
