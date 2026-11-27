import type { StorefrontTextSettings } from "./StorefrontTextForm";
import { StorefrontTextForm } from "./StorefrontTextForm";

export interface StorefrontSettingsPageProps {
  settings: StorefrontTextSettings;
  errors?: Record<string, string>;
  message?: string;
  savedMessage?: string;
}

export function StorefrontSettingsPage(props: StorefrontSettingsPageProps) {
  return <s-page heading="Settings">
    <s-section heading="Storefront texts">
      <s-stack direction="block" gap="base">
        <s-paragraph>These texts are shown on the storefront for every bundle and update as soon as you save.</s-paragraph>
        {props.savedMessage ? <s-banner tone="success">{props.savedMessage}</s-banner> : null}
      </s-stack>
    </s-section>
    <StorefrontTextForm key={props.settings.textVersion} settings={props.settings}
      errors={props.errors ?? {}} message={props.message} />
  </s-page>;
}
