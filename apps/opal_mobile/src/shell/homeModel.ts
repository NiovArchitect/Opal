import type { ComingUpItem, HomeSnapshot, NeedsYouItem } from "./types";
import { isProhibitedShellCopy } from "./signals";

export const NEEDS_YOU_EMPTY = "Nothing needs your attention right now.";
export const MAX_NEEDS_YOU = 3;

/**
 * R21 L-1 - THE GREETING IS TRUE (founder law, 2026-10-20).
 * The hour that picks the greeting word is the VIEWER's own hour:
 * the instant is read in the viewer's timezone, never in UTC.
 * With no explicit timezone the Intl default is the device's local
 * timezone - the viewer's. An invalid timezone falls back to that
 * same device-local hour. `now` / `timeZone` / `viewerHour` are the
 * pinned-clock seams the L-1 tests drive: the SAME instant must
 * render the morning word under one viewer timezone and the
 * evening word under another. (The pre-L-1 field was `hourUTC`,
 * defaulting to getUTCHours() - a UTC greeting, removed here.)
 */
export function hourInViewerTimeZone(now: Date, timeZone?: string): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hourCycle: "h23",
      }).formatToParts(now);
      const hour = Number(parts.find((p) => p.type === "hour")?.value);
      if (Number.isFinite(hour)) return hour % 24;
    } catch {
      // fall through to the device-local hour
    }
  }
  return now.getHours();
}

export function buildHomeSnapshot(input: {
  displayName: string;
  needsYou: NeedsYouItem[];
  comingUp: ComingUpItem[];
  recentChanges?: HomeSnapshot["recent_changes"];
  roleKind?: string;
  connectionState?: string;
  /** Pinned instant for tests; defaults to the moment of viewing. */
  now?: Date;
  /** The viewer's own timezone; defaults to the device timezone. */
  timeZone?: string;
  /** Explicit viewer-local hour override (pinned-clock tests). */
  viewerHour?: number;
}): HomeSnapshot {
  const hour = input.viewerHour ?? hourInViewerTimeZone(input.now ?? new Date(), input.timeZone);
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const needs = input.needsYou
    .filter((n) => !isProhibitedShellCopy(n.title) && !isProhibitedShellCopy(n.explanation))
    .slice(0, MAX_NEEDS_YOU);
  const empty = needs.length === 0;

  return {
    greeting: `${part}, ${input.displayName}.`,
    needs_you: needs,
    needs_you_empty_copy: empty ? NEEDS_YOU_EMPTY : null,
    coming_up: input.comingUp,
    recent_changes: input.recentChanges ?? [],
    quiet_success: empty,
    connection_state: input.connectionState ?? "online",
    role_context: { kind: input.roleKind ?? "adult" },
    no_engagement_counts: true,
    no_relationship_ranking: true,
    no_streaks: true,
  };
}

export function completeNeedsYouItem(
  items: NeedsYouItem[],
  id: string,
): NeedsYouItem[] {
  return items.filter((i) => i.id !== id);
}
