import type { StorefrontTextFieldDefinition, StorefrontTextKey } from "../storefront-text.types";
import { StorefrontTextFieldHelp } from "./StorefrontTextFieldHelp";

export interface StorefrontTextFieldProps {
  definition: StorefrontTextFieldDefinition;
  value: string;
  error?: string;
  onChange: (key: StorefrontTextKey, value: string) => void;
}

export function StorefrontTextField(props: StorefrontTextFieldProps) {
  const id = `storefront-text-${props.definition.key}`, errorId = `${id}-error`;
  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    props.onChange(props.definition.key, event.target.value);
  const controlProps = {
    id, name: `texts.${props.definition.key}`, value: props.value,
    maxLength: props.definition.maxLength, required: true,
    "aria-invalid": Boolean(props.error),
    "aria-describedby": props.error ? errorId : undefined,
    onChange: change,
  };
  return <label className="sb-settings-field" htmlFor={id}>
    <span className="sb-settings-field-label">{props.definition.label}</span>
    {props.definition.multiline ? <textarea {...controlProps} rows={3} /> : <input {...controlProps} type="text" />}
    <StorefrontTextFieldHelp definition={props.definition} />
    {props.error ? <span id={errorId} className="sb-settings-error" role="alert">{props.error}</span> : null}
  </label>;
}
