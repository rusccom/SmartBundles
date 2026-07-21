import type { ActionFunctionArgs } from "react-router";
import { handleProductWebhook } from "../features/webhooks/webhook-handlers.server";
import { processWebhook } from "../features/webhooks/process-webhook.server";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  const context = await authenticate.webhook(request);
  const handler = () => handleProductWebhook(String(context.topic), context.payload, context.webhookId, context.shop);
  return processWebhook({ ...context, handler });
}
