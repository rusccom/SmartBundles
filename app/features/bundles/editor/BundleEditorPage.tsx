import { Form, useNavigation } from "react-router";
import { BundleComponentsSection } from "./BundleComponentsSection";
import { BundleDetailsFields } from "./BundleDetailsFields";
import { BundleEditorActions } from "./BundleEditorActions";
import { BundleQuotaNotice } from "./BundleQuotaNotice";
import { BundlePricingFields } from "./BundlePricingFields";
import { serializedSelectors } from "./editor-state";
import type { BundleEditorInitial } from "./editor.types";
import { useBundleEditor } from "./useBundleEditor";

export interface BundleEditorPageProps {
  initial: BundleEditorInitial;
  errors?: Record<string, string>;
  quotaCandidates?: Array<{ id: string; title: string }>;
  pricingEnabled?: boolean;
  serverMessage?: string;
}

export function BundleEditorPage({ initial, errors = {}, quotaCandidates = [], pricingEnabled = false, serverMessage }: BundleEditorPageProps) {
  const editor = useBundleEditor(initial);
  const navigation = useNavigation();
  return <s-page heading={initial.id ? `Edit ${initial.title}` : "Create bundle"}>
    <s-link slot="breadcrumb-actions" href="/app/bundles">Bundles</s-link>
    <Form method="post" className="sb-editor-form">
      <input type="hidden" name="selectors" value={serializedSelectors(editor.selectors)} />
      <input type="hidden" name="bundleVersion" value={initial.version} />
      <input type="hidden" name="contentVersionToken" value={initial.contentVersionToken ?? ""} />
      <input type="hidden" name="creationToken" value={initial.creationToken ?? ""} />
      {serverMessage ? <s-banner tone={messageTone(initial.status)}>{serverMessage}</s-banner> : null}
      {quotaCandidates.length ? <BundleQuotaNotice candidates={quotaCandidates} pricingEnabled={pricingEnabled} /> : null}
      <BundleDetailsFields initial={initial} errors={errors} />
      <BundlePricingFields initial={initial} mode={editor.pricingMode} onModeChange={editor.changePricingMode}
        fixedPriceError={errors.fixedPrice} modeError={errors.pricingMode} discountError={errors.discountPercent} />
      <BundleComponentsSection editor={editor} currencyCode={initial.currencyCode} locale={initial.locale} error={errors.selectors} />
      <BundleEditorActions status={initial.status} busy={navigation.state !== "idle"} replacing={quotaCandidates.length > 0} />
    </Form>
  </s-page>;
}

function messageTone(status: string): "critical" | "success" {
  return status === "PAUSED" ? "success" : "critical";
}
