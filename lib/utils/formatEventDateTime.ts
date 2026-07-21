function toUtcParts(value: string | Date): { y: number; m: number; d: number } | null {
  if (typeof value === "string") {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return { y, m, d };
  }
  return {
    y: value.getUTCFullYear(),
    m: value.getUTCMonth() + 1,
    d: value.getUTCDate(),
  };
}

/** Format a YYYY-MM-DD (or Date) as a localized Gregorian invite date. */
export function formatEventDate(
  value: string | Date,
  msgLocale: "en" | "ar"
): string {
  const parts = toUtcParts(value);
  if (!parts) return typeof value === "string" ? value : "";
  const date = new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
  const intlLocale = msgLocale === "ar" ? "ar-SA" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
    calendar: "gregory",
  }).format(date);
}

export function formatEventTime(
  value: string,
  msgLocale: "en" | "ar"
): string {
  const [hh, mm] = value.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return value;
  const date = new Date(Date.UTC(1970, 0, 1, hh, mm, 0));
  const intlLocale = msgLocale === "ar" ? "ar-SA" : "en-US";
  const base: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: true,
    timeZone: "UTC",
  };
  const opts: Intl.DateTimeFormatOptions =
    mm === 0 ? base : { ...base, minute: "2-digit" };
  return new Intl.DateTimeFormat(intlLocale, opts).format(date);
}
