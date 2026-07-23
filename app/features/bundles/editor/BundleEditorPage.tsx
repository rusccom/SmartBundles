import { BundleEditorForm } from "./BundleEditorForm";
import type { BundleEditorInitial, BundleEditorRecovery } from "./editor.types";

export interface BundleEditorPageProps {
  initial: BundleEditorInitial;
  quotaCandidates?: Array<{ id: string; title: string }>;
  pricingEnabled?: boolean;
  recovery?: BundleEditorRecovery;
}

export function BundleEditorPage(props: BundleEditorPageProps) {
  return <s-page heading={props.initial.id ? `Edit ${props.initial.title}` : "Create bundle"}>
    <s-link slot="breadcrumb-actions" href="/app/bundles">Bundles</s-link>
    <BundleEditorForm initial={props.initial}
      quotaCandidates={props.quotaCandidates ?? []}
      pricingEnabled={props.pricingEnabled ?? false}
      recovery={props.recovery} />
  </s-page>;
}
