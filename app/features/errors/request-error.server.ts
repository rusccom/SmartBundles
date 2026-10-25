import { isRouteErrorResponse } from "react-router";
import { errorManager } from "./error-manager.server";

export function reportRequestError(error: unknown, url: string): void {
  const responseError = error instanceof Response || isRouteErrorResponse(error);
  if (responseError && error.status < 500) return;
  const parsed = new URL(url);
  const shop = parsed.searchParams.get("shop") ?? "";
  const failure = responseError ? new Error(`HTTP ${error.status}: ${error.statusText}`) : error;
  void errorManager.report(failure, {
    code: "SERVER_REQUEST_FAILED", source: "server",
    shopDomain: /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : undefined,
    context: { route: parsed.pathname },
  });
}
