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
      <s-number-field label="Bundle price (store currency)" name="price" defaultValue={initial.price} min={0.01} step={0.01} required error={errors.price} />
      <DescriptionEditor key={`${initial.id ?? "new"}:${initial.version}`} initialValue={initial.descriptionHtml} error={errors.description} />
      <s-paragraph>Title and description are loaded from and saved directly to Shopify.</s-paragraph>
      <s-paragraph>Customers pay this fixed bundle price regardless of the component variants they select.</s-paragraph>
    </s-stack>
  </s-section>;
}
