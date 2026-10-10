/**
 * Paste W6 Phase 5 — Opal Center "now" strip (live clock + data honesty).
 * Now + next two only. Sample day is never presented as the user's real calendar.
 */

export type DayStripEvent = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
};

export type DayStripNode = {
  id: string;
  time: string;
  label: string;
  kind: "now" | "open" | "event" | "accepted";
};

/** Provenance for the strip — never confuse sample with linked calendar. */
export type DayStripSource = "calendar" | "sample";

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
  "Sample day — not your real appointments. Link calendar for live events.";

export const CALENDAR_DAY_ATTRIBUTION = "From your linked calendar.";

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

/** Format strip time like the shell ("3:30", "7:30") — local, no AM/PM noise. */
export function formatStripTime(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}:00` : `${hour12}:${String(m).padStart(2, "0")}`;
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
    },
    ...upcoming.map((e) => ({
      id: e.id,
      time: formatStripTime(e.startMs),
      label: e.title,
      kind: "event" as const,
    })),
  ];

  return {
    nodes,
    source,
    attribution: source === "sample" ? SAMPLE_DAY_ATTRIBUTION : CALENDAR_DAY_ATTRIBUTION,
  };
}

/** Normalize API / fixture event payloads into strip events. */
export function normalizeDayStripEvents(
  raw: Array<{
    id?: string | null;
    title?: string | null;
    start_at?: string | null;
    end_at?: string | null;
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
    });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}
