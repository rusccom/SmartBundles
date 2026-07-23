import { useState } from "react";
import { BundleEditorForm } from "./BundleEditorForm";
import type { BundleEditorInitial } from "./editor.types";

export interface BundleEditorPageProps {
  initial: BundleEditorInitial;
  errors?: Record<string, string>;
  quotaCandidates?: Array<{ id: string; title: string }>;
  pricingEnabled?: boolean;
  serverMessage?: string;
}

export function BundleEditorPage({ initial, errors = {}, quotaCandidates = [], pricingEnabled = false, serverMessage }: BundleEditorPageProps) {
  const [discardVersion, setDiscardVersion] = useState(0);
  const formKey = `${initial.id ?? "new"}:${initial.version}:${discardVersion}`;
  return <s-page heading={initial.id ? `Edit ${initial.title}` : "Create bundle"}>
    <s-link slot="breadcrumb-actions" href="/app/bundles">Bundles</s-link>
    <BundleEditorForm key={formKey} initial={initial} errors={errors}
      quotaCandidates={quotaCandidates} pricingEnabled={pricingEnabled} serverMessage={serverMessage}
      onDiscard={() => setDiscardVersion((value) => value + 1)} />
  </s-page>;
}
