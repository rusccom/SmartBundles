import { BundleComponentsSection } from "./BundleComponentsSection";
import { BundleDetailsFields } from "./BundleDetailsFields";
import { BundleEditorFeedback } from "./BundleEditorFeedback";
import { BundlePricingFields } from "./BundlePricingFields";
import { BundleQuotaNotice } from "./BundleQuotaNotice";
import type { BundleEditorInitial } from "./editor.types";
import type { BundleEditorController } from "./useBundleEditorController";

export interface BundleEditorSectionsProps {
  initial: BundleEditorInitial;
  controller: BundleEditorController;
  quotaCandidates: Array<{ id: string; title: string }>;
  pricingEnabled: boolean;
}

export function BundleEditorSections(props: BundleEditorSectionsProps) {
  const { controller, initial } = props;
  return <>
    <BundleEditorFeedback controller={controller} />
    {controller.issue === "quota" ? <BundleQuotaNotice candidates={props.quotaCandidates}
      pricingEnabled={props.pricingEnabled} value={controller.draft.replacementId}
      onChange={(replacementId) => controller.patch({ replacementId })} /> : null}
    <BundleDetailsFields controller={controller} />
    <BundlePricingFields currencyCode={initial.currencyCode} controller={controller} />
    <BundleComponentsSection controller={controller} currencyCode={initial.currencyCode}
      locale={initial.locale} error={controller.errors.selectors} />
  </>;
}
