import { BundleEditorForm } from "./BundleEditorForm";
import type { BundleEditorInitial } from "./editor.types";

export interface BundleEditorPageProps {
  initial: BundleEditorInitial;
  pricingEnabled?: boolean;
}

export function BundleEditorPage(props: BundleEditorPageProps) {
  return <s-page heading={props.initial.id ? "Edit bundle" : "Create bundle"}>
    <s-link slot="breadcrumb-actions" href="/app/bundles">Bundles</s-link>
    <BundleEditorForm initial={props.initial}
      pricingEnabled={props.pricingEnabled ?? false} />
  </s-page>;
}
