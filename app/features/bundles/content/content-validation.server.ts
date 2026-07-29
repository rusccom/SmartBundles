import {
  descriptionsSemanticallyEqual,
  sanitizeDescription,
} from "../../rich-text/description/description-sanitize.server";
import type { BundleContentPatch } from "../bundle.types";

const MAX_TITLE_LENGTH = 255;

export function validateCreationContent(
  title: string,
  descriptionHtml: string,
): Record<string, string> {
  return validateContentPatch({ title, descriptionHtml });
}

export function validateContentPatch(patch: BundleContentPatch): Record<string, string> {
  const errors: Record<string, string> = {};
  if (patch.title !== undefined) validateTitle(patch.title, errors);
  if (patch.descriptionHtml !== undefined) validateDescription(patch.descriptionHtml, errors);
  return errors;
}

function validateTitle(value: string, errors: Record<string, string>): void {
  if (!value || value.trim() !== value) {
    errors.title = "Enter a title without leading or trailing spaces.";
    return;
  }
  if (Array.from(value).length > MAX_TITLE_LENGTH) errors.title = "Title cannot exceed 255 characters.";
  if (Array.from(value).some(isControlCharacter)) errors.title = "Title contains unsupported control characters.";
}

function isControlCharacter(value: string): boolean {
  const code = value.charCodeAt(0);
  return code <= 31 || code === 127;
}

function validateDescription(value: string, errors: Record<string, string>): void {
  const checked = sanitizeDescription(value);
  if (checked.error) {
    errors.description = checked.error;
    return;
  }
  if (!descriptionsSemanticallyEqual(value, checked.value)) {
    errors.description = "Description contains HTML that cannot be saved safely. Remove unsupported tags or attributes.";
  }
}
