import { BundleComponentsSection } from "./BundleComponentsSection";
import { BundleDetailsFields } from "./BundleDetailsFields";
import { BundlePricingFields } from "./BundlePricingFields";
import { BundleQuotaNotice } from "./BundleQuotaNotice";
import type { BundleEditorFormProps } from "./BundleEditorForm";
import type { ReturnTypeBundleEditor } from "./bundle-editor-hook.types";
import type { BundleDesiredStatus } from "../bundle.types";

export interface BundleEditorSectionsProps extends BundleEditorFormProps {
  editor: ReturnTypeBundleEditor;
  status: BundleDesiredStatus;
  busy: boolean;
  onStatusChange: (status: BundleDesiredStatus) => void;
}

export function BundleEditorSections(props: BundleEditorSectionsProps) {
  const { initial, errors, editor } = props;
  return <>
    {props.serverMessage ? <s-banner tone={messageTone(initial.status)}>{props.serverMessage}</s-banner> : null}
    {props.quotaCandidates.length ? <BundleQuotaNotice candidates={props.quotaCandidates}
      pricingEnabled={props.pricingEnabled} /> : null}
    <BundleDetailsFields initial={initial} errors={errors} status={props.status}
      statusDisabled={props.busy} onStatusChange={props.onStatusChange} />
    <BundlePricingFields initial={initial} mode={editor.pricingMode} onModeChange={editor.changePricingMode}
      fixedPriceError={errors.fixedPrice} modeError={errors.pricingMode} discountError={errors.discountPercent} />
    <BundleComponentsSection editor={editor} currencyCode={initial.currencyCode}
      locale={initial.locale} error={errors.selectors} />
  </>;
}

function messageTone(status: string): "critical" | "success" {
  return status === "PAUSED" ? "success" : "critical";
}
