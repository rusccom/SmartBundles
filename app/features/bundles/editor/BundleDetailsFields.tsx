import type { BundleEditorInitial } from "./editor.types";
import type { BundleDesiredStatus } from "../bundle.types";
import { DescriptionEditor } from "../../rich-text/description/DescriptionEditor";
import { BundleStatusSelect } from "./BundleStatusSelect";

export interface BundleDetailsFieldsProps {
  initial: BundleEditorInitial;
  errors: Record<string, string>;
  status: BundleDesiredStatus;
  statusDisabled: boolean;
  onStatusChange: (value: BundleDesiredStatus) => void;
}

export function BundleDetailsFields(props: BundleDetailsFieldsProps) {
  return <s-section>
    <div className="sb-details-header">
      <s-heading>Details</s-heading>
      <BundleStatusSelect value={props.status} disabled={props.statusDisabled}
        error={props.errors.desiredStatus} onChange={props.onStatusChange} />
    </div>
    <s-stack direction="block" gap="base">
      <s-text-field label="Bundle title" name="title" defaultValue={props.initial.title}
        required error={props.errors.title} />
      <DescriptionEditor key={`${props.initial.id ?? "new"}:${props.initial.version}`}
        initialValue={props.initial.descriptionHtml} error={props.errors.description} />
      <s-paragraph>Title and description are loaded from and saved directly to Shopify.</s-paragraph>
    </s-stack>
  </s-section>;
}
