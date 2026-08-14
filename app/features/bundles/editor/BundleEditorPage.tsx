import { BundlePreviewPanel } from "../preview/BundlePreviewPanel";
import { BundleEditorForm } from "./BundleEditorForm";
import { BundleEditorProductActions } from "./BundleEditorProductActions";
import { BundleEditorSaveBar } from "./BundleEditorSaveBar";
import type { BundleEditorInitial } from "./editor.types";
import { useBundleEditorController } from "./useBundleEditorController";

export interface BundleEditorPageProps {
  initial: BundleEditorInitial;
  pricingEnabled?: boolean;
  productGid?: string;
  storefrontUrl?: string | null;
}

export function BundleEditorPage(props: BundleEditorPageProps) {
  const { initial } = props;
  const controller = useBundleEditorController(initial);
  return <s-page heading={initial.id ? "Edit bundle" : "Create bundle"}>
    <s-link slot="breadcrumb-actions" href="/app/bundles">Bundles</s-link>
    {props.productGid ? <BundleEditorProductActions productGid={props.productGid}
      storefrontUrl={props.storefrontUrl ?? null} /> : null}
    <BundleEditorSaveBar dirty={controller.dirty} saving={controller.saving}
      blocked={controller.busy}
      onSave={controller.submit} onDiscard={controller.discard} />
    <BundleEditorForm initial={initial} controller={controller}
      pricingEnabled={props.pricingEnabled ?? false} />
    <BundlePreviewPanel draft={controller.draft} currencyCode={initial.currencyCode}
      image={initial.image} locale={initial.locale} texts={initial.texts} />
  </s-page>;
}
