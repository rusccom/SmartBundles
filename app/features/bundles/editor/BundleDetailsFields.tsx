import type { BundleEditorInitial } from "./editor.types";
import { DescriptionEditor } from "../../rich-text/description/DescriptionEditor";

export interface BundleDetailsFieldsProps {
  initial: BundleEditorInitial;
  errors: Record<string, string>;
}

export function BundleDetailsFields({ initial, errors }: BundleDetailsFieldsProps) {
  return <s-section heading="Details">
    <s-stack direction="block" gap="base">
      <s-text-field label="Bundle title" name="title" defaultValue={initial.title} required error={errors.title} />
      <DescriptionEditor key={`${initial.id ?? "new"}:${initial.version}`} initialValue={initial.descriptionHtml} error={errors.description} />
      <s-paragraph>Title and description are loaded from and saved directly to Shopify.</s-paragraph>
    </s-stack>
  </s-section>;
}
