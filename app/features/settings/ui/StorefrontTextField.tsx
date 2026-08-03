import type { StorefrontTextFieldDefinition, StorefrontTextKey } from "../storefront-text.types";

export interface StorefrontTextFieldProps {
  definition: StorefrontTextFieldDefinition;
  value: string;
  error?: string;
  onChange: (key: StorefrontTextKey, value: string) => void;
}

export function StorefrontTextField(props: StorefrontTextFieldProps) {
  const { definition } = props;
  const common = {
    label: definition.label,
    name: `texts.${definition.key}`,
    value: props.value,
    maxLength: definition.maxLength,
    error: props.error,
    details: helpText(definition),
  };
  const change = (value: string) => props.onChange(definition.key, value);
  if (definition.multiline) {
    return <s-text-area {...common} rows={3}
      onInput={(event) => change(event.currentTarget.value)} />;
  }
  return <s-text-field {...common}
    onInput={(event) => change(event.currentTarget.value)} />;
}

function helpText(definition: StorefrontTextFieldDefinition): string {
  const tokens = definition.requiredTokens;
  if (!tokens?.length) return `${definition.maxLength} characters maximum.`;
  return `Required placeholders: ${tokens.join(", ")}`;
}
