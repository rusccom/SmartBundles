export function editorLocale(request: Request): string {
  const language = request.headers.get("accept-language")?.split(",")[0]?.split(";")[0]?.trim();
  return supportedLocale(language) ?? "en";
}

function supportedLocale(locale?: string): string | undefined {
  if (!locale) return undefined;
  try {
    return Intl.NumberFormat.supportedLocalesOf([locale])[0];
  } catch {
    return undefined;
  }
}
