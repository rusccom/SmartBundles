import { errorManager } from "./error-manager.server";

export function reportRequestError(error: unknown, url: string): void {
  if (error instanceof Response && error.status < 500) return;
  const parsed = new URL(url);
  const shop = parsed.searchParams.get("shop") ?? "";
  void errorManager.report(error, {
    code: "SERVER_REQUEST_FAILED", source: "server",
    shopDomain: /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : undefined,
    context: { route: parsed.pathname },
  });
}
