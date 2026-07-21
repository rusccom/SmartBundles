import { timingSafeEqual } from "node:crypto";
import type { ActionFunctionArgs } from "react-router";
import { runMaintenance } from "../features/operations/maintenance.server";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const secret = process.env.CRON_SECRET;
  if (!secret) return response({ error: "Maintenance is not configured" }, 503);
  if (!authorized(request, secret)) return unauthorized();
  try {
    return response(await runMaintenance(), 200);
  } catch {
    return response({ error: "Maintenance failed" }, 500);
  }
}

export function loader(): Response {
  return response({ error: "Method not allowed" }, 405);
}

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: headers({ "WWW-Authenticate": "Bearer" }),
  });
}

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: headers() });
}

function headers(extra: Record<string, string> = {}): HeadersInit {
  return { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra };
}
