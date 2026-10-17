/**
 * Paste W6 Phase 5 — Opal Center "now" strip (live clock + data honesty).
 * Now + next two only. Sample day is never presented as the user's real calendar.
 */

import { formatClockAmPm } from "./composeHumanReality";

export type DayStripEvent = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  /**
   * Repair #18 (F18-09) - who/where from the backend NowStrip contract
   * (participant display names excluding the viewer, and the plan's
   * place). Carried, never derived here. Empty who / null where render
   * nothing extra - a solo plan's node is its title alone.
   */
  who?: string[];
  where?: string | null;
};

export type DayStripNode = {
  id: string;
  time: string;
  label: string;
  kind: "now" | "open" | "event" | "accepted";
  /** Repair #18 - "with {names} - {place}", each part omitted when unknown. */
  detail?: string | null;
};

/** Second line for a strip node, built ONLY from contract who/where. */
export function dayStripDetail(event: Pick<DayStripEvent, "who" | "where">): string | null {
  const names = (event.who || []).map((n) => (n || "").trim()).filter(Boolean);
  const place = (event.where || "").trim();
  const parts: string[] = [];
  if (names.length) parts.push(`with ${names.join(", ")}`);
  if (place) parts.push(place);
  return parts.length ? parts.join(" - ") : null;
}

/** Provenance for the strip — never confuse sample with linked calendar. */
export type DayStripSource = "calendar" | "plans" | "none" | "sample";

export type DayStripResult = {
  nodes: DayStripNode[];
  source: DayStripSource;
  /** Customer-facing honesty line under the strip. */
  attribution: string;
};

/** Founder-seed SAMPLE day specs (local clock). Not the user's appointments. */
export const SAMPLE_DAY_SPECS = [
  { id: "sample-appointment", title: "Appointment", hour: 15, minute: 30, durationMin: 60 },
  { id: "sample-dinner", title: "Dinner", hour: 19, minute: 30, durationMin: 90 },
] as const;

export const STRIP_TICK_MS = 60_000;

export const SAMPLE_DAY_ATTRIBUTION =
  "Sample day - not your real appointments. Link calendar for live events.";

export const CALENDAR_DAY_ATTRIBUTION = "From your linked calendar.";

export const PLANS_DAY_ATTRIBUTION = "From your plans.";

/** Repair #17 W5 — honest empty state: nothing real exists to paint. */
export const EMPTY_DAY_ATTRIBUTION = "Nothing on your day yet.";

/** Build sample events for the local calendar day of `now`. */
export function sampleDayEventsFor(now: Date = new Date()): DayStripEvent[] {
  return SAMPLE_DAY_SPECS.map((spec) => {
    const start = new Date(now);
    start.setHours(spec.hour, spec.minute, 0, 0);
    const end = new Date(start.getTime() + spec.durationMin * 60_000);
    return {
      id: spec.id,
      title: spec.title,
      startMs: start.getTime(),
      endMs: end.getTime(),
    };
  });
}

/** Format strip time through the canonical clock — always carries AM/PM (F12-10). */
export function formatStripTime(ms: number): string {
  return formatClockAmPm(new Date(ms));
}

/**
 * Compose Now + next two from real clock.
 * Current event (if any) becomes the Now label; otherwise Now / Open.
 */
export function composeNowStrip(opts: {
  nowMs: number;
  events: DayStripEvent[];
  source: DayStripSource;
}): DayStripResult {
  const { nowMs, source } = opts;
  const events = [...opts.events].sort((a, b) => a.startMs - b.startMs);

  const current = events.find((e) => e.startMs <= nowMs && nowMs < e.endMs) ?? null;
  const upcoming = events
    .filter((e) => e.startMs > nowMs)
    .slice(0, 2);

  const nodes: DayStripNode[] = [
    {
      id: "now",
      time: "Now",
      label: current ? current.title : "Open",
      kind: "now",
      // Only present when the contract actually carries who/where.
      ...(current && dayStripDetail(current)
        ? { detail: dayStripDetail(current) }
        : {}),
    },
    ...upcoming.map((e) => ({
      id: e.id,
      time: formatStripTime(e.startMs),
      label: e.title,
      kind: "event" as const,
      ...(dayStripDetail(e) ? { detail: dayStripDetail(e) } : {}),
    })),
  ];

  return {
    nodes,
    source,
    attribution:
      source === "sample"
        ? SAMPLE_DAY_ATTRIBUTION
        : source === "plans"
          ? PLANS_DAY_ATTRIBUTION
          : source === "none"
            ? EMPTY_DAY_ATTRIBUTION
            : CALENDAR_DAY_ATTRIBUTION,
  };
}

const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** First explicit clock time in a human time label ("Sat 7:30 PM" -> minutes). */
export function extractLabelTimeMinutes(label: string): number | null {
  const m = label.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] || "0");
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const ap = m[3].toUpperCase();
  if (ap === "AM") hour = hour === 12 ? 0 : hour;
  if (ap === "PM") hour = hour === 12 ? 12 : hour + 12;
  return hour * 60 + minute;
}

/** Weekday indexes explicitly named in a label ("Sat", "Sunday" -> [6]). */
export function labelWeekdays(label: string): number[] {
  const text = label.toLowerCase();
  const found = new Set<number>();
  WEEKDAY_NAMES.forEach((name, idx) => {
    const short = name.slice(0, 3);
    if (new RegExp(`\\b(${name}|${short})\\b`).test(text)) found.add(idx);
  });
  return [...found];
}

export type PlanStripRow = {
  id: string;
  title?: string | null;
  status?: string | null;
  time_label?: string | null;
};

/**
 * Repair #17 W5 — project the user's REAL plans onto today's strip.
 *
 * A plan is painted only when its own time label proves it belongs to
 * today AND carries an explicit clock time: a "today"/"tonight" token,
 * or a weekday token matching today. "Saturday after 10" (no AM/PM),
 * "Open window", and other days' plans are never placed — placing them
 * would fabricate a time the plan does not have. Default duration 60m
 * matches the strip's event convention; only start + title are asserted.
 */
export function planEventsForToday(
  plans: PlanStripRow[],
  now: Date = new Date(),
): DayStripEvent[] {
  const out: DayStripEvent[] = [];
  const seen = new Set<string>();
  const todayIdx = now.getDay();
  for (const plan of plans) {
    if (!plan?.id || seen.has(plan.id)) continue;
    if (/cancel|complete|completed|done|past|expired|superseded/i.test(plan.status || "")) {
      continue;
    }
    const label = (plan.time_label || "").trim();
    if (!label) continue;
    const minutes = extractLabelTimeMinutes(label);
    if (minutes === null) continue;
    const days = labelWeekdays(label);
    const saysToday = /\b(today|tonight)\b/i.test(label);
    if (!saysToday && days.length > 0 && !days.includes(todayIdx)) continue;
    if (!saysToday && days.length === 0) continue;
    const start = new Date(now);
    start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    seen.add(plan.id);
    out.push({
      id: `plan-${plan.id}`,
      title: (plan.title || "").trim() || "Plan",
      startMs: start.getTime(),
      endMs: start.getTime() + 60 * 60_000,
    });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

/** Normalize API / fixture event payloads into strip events. */
export function normalizeDayStripEvents(
  raw: Array<{
    id?: string | null;
    title?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    who?: string[] | null;
    where?: string | null;
  }>,
): DayStripEvent[] {
  const out: DayStripEvent[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const startMs = row.start_at ? Date.parse(row.start_at) : NaN;
    const endMs = row.end_at ? Date.parse(row.end_at) : NaN;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
    const title = (row.title || "").trim() || "Busy";
    out.push({
      id: (row.id && String(row.id)) || `cal-${i}-${startMs}`,
      title,
      startMs,
      endMs,
      // Repair #18 - who/where ride through untouched from the contract;
      // calendar rows without them simply carry none.
      who: Array.isArray(row.who)
        ? row.who.filter((n): n is string => typeof n === "string" && n.trim() !== "")
        : undefined,
      where: typeof row.where === "string" && row.where.trim() ? row.where.trim() : null,
    });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}
