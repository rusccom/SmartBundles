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
  return <section className="sb-settings-group">
    <h2>{props.group}</h2>
    <div className="sb-settings-fields">
      {fields.map((definition) => <StorefrontTextField key={definition.key}
        definition={definition} value={props.texts[definition.key]}
        error={props.errors[definition.key]} onChange={props.onChange} />)}
    </div>
  </section>;
}
