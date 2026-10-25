import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { errorManager } from "../features/errors/error-manager.server";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const { session } = await authenticate.admin(request);
  if (Number(request.headers.get("content-length")) > 4000) return new Response(null, { status: 413 });
  const body = await request.text();
  if (body.length > 4000) return new Response(null, { status: 413 });
  try {
    const input: unknown = JSON.parse(body);
    if (!validReport(input)) return new Response(null, { status: 400 });
    await errorManager.report(input.message, { code: "ADMIN_RUNTIME_ERROR", source: "admin", shopDomain: session.shop,
      context: { route: input.route.split(/[?#]/)[0].slice(0, 250) } });
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 400 }); }
}

function validReport(value: unknown): value is { message: string; route: string } {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return typeof input.message === "string" && input.message.length <= 1000
    && typeof input.route === "string" && input.route.startsWith("/app");
}
