export function formatDate(value: string, locale: string, withTime = false): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium", timeStyle: withTime ? "short" : undefined, timeZone: "UTC",
  }).format(new Date(value));
}
