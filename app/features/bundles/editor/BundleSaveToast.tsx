import { useEffect } from "react";
import { useLocation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

const SUCCESS_PARAMS = ["saved", "published", "paused"];

export function BundleSaveToast() {
  const shopify = useAppBridge();
  const location = useLocation();
  useEffect(() => {
    if (!hasSaveSuccess(location.search)) return;
    shopify.toast.show("Bundle saved");
    clearSaveSuccess();
  }, [location.key, location.search, shopify]);
  return null;
}

function hasSaveSuccess(search: string): boolean {
  const params = new URLSearchParams(search);
  return SUCCESS_PARAMS.some((name) => params.has(name));
}

function clearSaveSuccess(): void {
  const url = new URL(window.location.href);
  SUCCESS_PARAMS.forEach((name) => url.searchParams.delete(name));
  window.history.replaceState(window.history.state, "", url);
}
