import { BundleEditorLayout } from "./BundleEditorLayout";
import { BundleEditorProductActions } from "./BundleEditorProductActions";
import { AppSaveBar } from "../../shell/AppSaveBar";
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
    <AppSaveBar id="bundle-editor-save-bar" dirty={controller.dirty} saving={controller.saving}
      blocked={controller.busy}
      onSave={controller.submit} onDiscard={controller.discard} />
    <BundleEditorLayout initial={initial} controller={controller}
      pricingEnabled={props.pricingEnabled ?? false} />
  </s-page>;
}
