import { safeErrorText } from "./error-sanitize";

const sent = new Map<string, number>();

export function reportAdminError(error: unknown): void {
  const message = safeErrorText(error instanceof Error ? error.message : String(error)).slice(0, 1000);
  const now = Date.now();
  for (const [key, timestamp] of sent) if (timestamp < now - 60_000) sent.delete(key);
  if (sent.has(message) || sent.size >= 5) return;
  sent.set(message, now);
  void fetch("/app/error-reports", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, route: window.location.pathname }),
  }).catch(() => undefined);
}
