const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const ALLOWED_SCHEME = /^(https?:|mailto:|tel:)/i;

export function isSafeDescriptionHref(value: string): boolean {
  const href = value.trim();
  if (!href || href.startsWith("//") || href.startsWith("\\\\")) return false;
  if (hasUnsafeWhitespace(href)) return false;
  return !SCHEME.test(href) || ALLOWED_SCHEME.test(href);
}

export function normalizedDescriptionHref(value: string): string | null {
  const href = value.trim();
  return isSafeDescriptionHref(href) ? href : null;
}

function hasUnsafeWhitespace(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 32 || code === 127;
  });
}
