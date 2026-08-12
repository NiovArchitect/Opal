/** Format backend UTC instants for display in the viewer's local timezone. */

export function formatOverlapRange(
  displayStart: string,
  displayEnd: string,
  locale?: string,
): string {
  const start = new Date(displayStart);
  const end = new Date(displayEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const day = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(start);

  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const startT = new Intl.DateTimeFormat(locale, timeOpts).format(start);
  const endT = new Intl.DateTimeFormat(locale, timeOpts).format(end);
  return `${day}, ${startT}–${endT}`;
}

/** Open-ended social start: Thursday · 7:00 PM (no fake until). */
export function formatStartOnly(displayStart: string, locale?: string): string {
  const start = new Date(displayStart);
  if (Number.isNaN(start.getTime())) return "";
  const day = new Intl.DateTimeFormat(locale, {
    weekday: "long",
  }).format(start);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
  return `${day} · ${time}`;
}

export function viewerTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Convert datetime-local value to ISO for the API. */
export function localInputToIso(localValue: string): string | null {
  if (!localValue) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
