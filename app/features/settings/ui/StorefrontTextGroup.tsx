import { STOREFRONT_TEXT_FIELDS } from "../storefront-text-fields";
import type {
  StorefrontTextGroup as GroupName,
  StorefrontTextKey,
  StorefrontTexts,
} from "../storefront-text.types";
import { StorefrontTextField } from "./StorefrontTextField";

export interface StorefrontTextGroupProps {
  group: GroupName;
  texts: StorefrontTexts;
  errors: Record<string, string>;
  onChange: (key: StorefrontTextKey, value: string) => void;
}

export function StorefrontTextGroup(props: StorefrontTextGroupProps) {
  const fields = STOREFRONT_TEXT_FIELDS.filter(({ group }) => group === props.group);
  return <s-section heading={props.group}>
    <s-query-container>
    <s-grid gridTemplateColumns='@container (inline-size >= 600px) "repeat(2, minmax(0, 1fr))", "minmax(0, 1fr)"' gap="base">
      {fields.map((definition) => <StorefrontTextField key={definition.key}
        definition={definition} value={props.texts[definition.key]}
        error={props.errors[definition.key]} onChange={props.onChange} />)}
    </s-grid>
    </s-query-container>
  </s-section>;
}
