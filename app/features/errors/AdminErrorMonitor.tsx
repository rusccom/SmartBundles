import { useEffect } from "react";
import { reportAdminError } from "./error-manager.client";

export function AdminErrorMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.filename && !event.filename.startsWith(window.location.origin)) return;
      reportAdminError(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => reportAdminError(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
