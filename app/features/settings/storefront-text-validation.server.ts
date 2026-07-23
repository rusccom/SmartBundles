import { STOREFRONT_TEXT_FIELDS } from "./storefront-text-fields";
import type {
  StorefrontTextFieldDefinition,
  StorefrontTexts,
  StorefrontTextsParseResult,
} from "./storefront-text.types";

const MAX_JSON_BYTES = 6_144;
const TOKEN_PATTERN = /__[A-Za-z][A-Za-z0-9_]*__/g;

export function parseStorefrontTextsForm(form: FormData): StorefrontTextsParseResult {
  const record = Object.fromEntries(STOREFRONT_TEXT_FIELDS.map(({ key }) =>
    [key, formText(form, `texts.${key}`)]));
  return validatedTexts(record);
}

export function parseStoredStorefrontTexts(value: unknown): StorefrontTexts {
  if (!isRecord(value)) throw new Error("Stored storefront texts are invalid.");
  const parsed = validatedTexts(value);
  if (!parsed.data || Object.keys(parsed.errors).length) {
    throw new Error("Stored storefront texts are invalid.");
  }
  return parsed.data;
}

function validatedTexts(record: Record<string, unknown>): StorefrontTextsParseResult {
  const data: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const definition of STOREFRONT_TEXT_FIELDS) {
    const value = normalizedValue(record[definition.key]);
    const error = fieldError(definition, value);
    if (error) errors[definition.key] = error;
    data[definition.key] = value;
  }
  if (unknownKeys(record).length) errors.form = "The storefront text configuration is invalid.";
  if (jsonBytes(data) > MAX_JSON_BYTES) errors.form = "Storefront texts must be smaller than 6 KB.";
  return Object.keys(errors).length ? { errors } : { data: data as unknown as StorefrontTexts, errors };
}

function fieldError(definition: StorefrontTextFieldDefinition, value: string): string | undefined {
  if (!value) return "Enter text for this field.";
  if (value.length > definition.maxLength) {
    return `Use ${definition.maxLength} characters or fewer.`;
  }
  const tokens: string[] = value.match(TOKEN_PATTERN) ?? [];
  const required: string[] = definition.requiredTokens ?? [];
  if (!sameTokens(tokens, required)) return placeholderError(required);
  return undefined;
}

function sameTokens(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  return sortedActual.every((token, index) => token === sortedExpected[index]);
}

function placeholderError(required: string[]): string {
  if (!required.length) return "Remove unsupported placeholders.";
  return `Use each required placeholder once: ${required.join(", ")}.`;
}

function unknownKeys(record: Record<string, unknown>): string[] {
  const keys = new Set<string>(STOREFRONT_TEXT_FIELDS.map(({ key }) => key));
  return Object.keys(record).filter((key) => !keys.has(key));
}

function formText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function normalizedValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
