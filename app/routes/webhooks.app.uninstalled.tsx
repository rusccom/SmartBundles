import type { ActionFunctionArgs } from "react-router";
import { handleUninstalled } from "../features/webhooks/webhook-handlers.server";
import { processWebhook } from "../features/webhooks/process-webhook.server";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  const context = await authenticate.webhook(request);
  return processWebhook({ ...context, handler: () => handleUninstalled(context.shop) });
}
