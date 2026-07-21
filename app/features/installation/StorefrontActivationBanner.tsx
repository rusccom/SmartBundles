import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

export interface StorefrontActivationBannerProps {
  editorUrl?: string;
}

export function StorefrontActivationBanner({ editorUrl }: StorefrontActivationBannerProps) {
  const active = useStorefrontActive();
  if (active || !editorUrl) return null;
  return <s-banner tone="warning">
    Activate SmartBundle once in the published theme. Bundle selectors will then be placed automatically on bundle product pages.{' '}
    <s-link href={editorUrl} target="_blank">Activate storefront</s-link>
  </s-banner>;
}

function useStorefrontActive(): boolean {
  const shopify = useAppBridge();
  const [active, setActive] = useState(false);
  useEffect(() => {
    let current = true;
    const refresh = () => shopify.app.extensions()
      .then((extensions) => current && setActive(hasActiveEmbed(extensions)))
      .catch(() => current && setActive(false));
    const refreshVisible = () => { if (!document.hidden) void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      current = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [shopify]);
  return active;
}

function hasActiveEmbed(extensions: Awaited<ReturnType<ReturnType<typeof useAppBridge>["app"]["extensions"]>>): boolean {
  return extensions.some((extension) => extension.type === "theme_app_extension"
    && extension.activations.some((activation) => "status" in activation
      && "handle" in activation
      && "activations" in activation
      && activation.handle === "smart-bundle"
      && activation.target === "body"
      && activation.status === "active"
      && Array.isArray(activation.activations)
      && activation.activations.some((placement: { target?: unknown }) => placement.target === "theme")));
}
