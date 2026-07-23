import type { StorefrontTextFieldDefinition } from "../storefront-text.types";

export interface StorefrontTextFieldHelpProps {
  definition: StorefrontTextFieldDefinition;
}

export function StorefrontTextFieldHelp({ definition }: StorefrontTextFieldHelpProps) {
  const tokens = definition.requiredTokens;
  if (!tokens?.length) return <small>{definition.maxLength} characters maximum.</small>;
  return <small>Required placeholders: <code>{tokens.join(", ")}</code></small>;
}
