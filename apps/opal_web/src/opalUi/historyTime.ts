/** One list-time voice for Chats, Calls, and other history rows. */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function clock(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Compact history. A weekday does not stay forever. */
export function formatHistoryInstant(when: Date, now = new Date()): string {
  const time = clock(when);
  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(when)) / DAY_MS);
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `Yesterday · ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = when.toLocaleDateString(undefined, { weekday: "long" });
    return `${weekday} · ${time}`;
  }
  const sameYear = when.getFullYear() === now.getFullYear();
  const date = when.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  return `${date} · ${time}`;
}

/** Unambiguous date for a detail surface. */
export function formatHistoryDetail(when: Date): string {
  const date = when.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${date} · ${clock(when)}`;
}
