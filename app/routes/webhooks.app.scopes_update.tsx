import type { ActionFunctionArgs } from "react-router";
import { handleScopeUpdate } from "../features/webhooks/webhook-handlers.server";
import { processWebhook } from "../features/webhooks/process-webhook.server";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  const context = await authenticate.webhook(request);
  const scopes = scopeList(context.payload);
  return processWebhook({ ...context, handler: () => handleScopeUpdate(context.shop, scopes) });
}

function scopeList(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || !("current" in payload)) return [];
  return Array.isArray(payload.current) ? payload.current.filter((item): item is string => typeof item === "string") : [];
}
