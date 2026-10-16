/**
 * Paste J Phase 5 - Graph calendaring helpers.
 * Temporal context on person nodes + 30/90 timeline filter + opt-in ICS.
 * No em dashes in customer-facing strings.
 *
 * PERSON_TEMPORAL_SEED is lab/fixture only (Pass 1H). Production seed-off
 * must not paint inferred person history — that implies Pass 2 intelligence.
 */
import { isFounderSeedEnabled } from "./founderGraphSeed";
import { formatClockAmPm } from "./composeHumanReality";

export type TimelineBucket =
  | "now"
  | "tonight"
  | "weekend"
  | "next_week"
  | "next_month"
  | "someday"
  | "earlier";

export type TimelineItem = {
  id: string;
  title: string;
  whenLabel: string;
  who: string[];
  where?: string;
  status?: string;
  bucket: TimelineBucket;
  groupSize?: number;
  closeness?: number;
  nurtureSignal?: string;
  startsAt?: string;
  source?: "seed" | "live";
  conversationId?: string;
};

export type PersonUpcomingPlan = {
  id: string;
  title: string;
  whenLabel: string;
};

export type PersonOpenLoop = {
  id: string;
  label: string;
};

export type PersonTemporalContext = {
  person: string;
  upcomingPlans: PersonUpcomingPlan[];
  nextOpenLoop: PersonOpenLoop | null;
};

/** Seed temporal context per person (honest sample until live person API). */
export const PERSON_TEMPORAL_SEED: Record<string, PersonTemporalContext> = {
  chanelle: {
    person: "Chanelle",
    upcomingPlans: [
      { id: "seed-chanelle-juniper", title: "Juniper & Ivy", whenLabel: "Sat · 7:30" },
      { id: "seed-near-rooftop", title: "Rooftop lights", whenLabel: "Next week" },
      { id: "seed-japan-someday", title: "Japan someday", whenLabel: "Someday" },
    ],
    nextOpenLoop: {
      id: "loop-chanelle-table",
      label: "Still settling the table time",
    },
  },
  maya: {
    person: "Maya",
    upcomingPlans: [
      {
        id: "seed-maya-graph-coast",
        title: "Farmers market + coast",
        whenLabel: "Saturday · after 10",
      },
    ],
    nextOpenLoop: {
      id: "loop-maya-coast",
      label: "Coast if clear, still open",
    },
  },
  alex: {
    person: "Alex",
    upcomingPlans: [
      { id: "seed-near-rooftop", title: "Rooftop lights", whenLabel: "Next week" },
      { id: "seed-alex-graph-gallery", title: "Mexico City trip", whenLabel: "Trip Graph" },
    ],
    nextOpenLoop: {
      id: "loop-alex-gallery",
      label: "Stay taking shape",
    },
  },
  jordan: {
    person: "Jordan",
    upcomingPlans: [
      {
        id: "seed-jordan-market",
        title: "Oceanside market (with Maya)",
        whenLabel: "Saturday · 10",
      },
      {
        id: "seed-chanelle-juniper",
        title: "Juniper crew dinner",
        whenLabel: "Saturday · 7:30",
      },
    ],
    nextOpenLoop: {
      id: "loop-jordan-skate",
      label: "New skate spot: who is in?",
    },
  },
  sabrina: {
    person: "Sabrina",
    upcomingPlans: [
      { id: "seed-chanelle-juniper", title: "Juniper & Ivy", whenLabel: "Sat · 7:30" },
    ],
    nextOpenLoop: {
      id: "loop-sabrina-dessert",
      label: "Late dessert run still open",
    },
  },
};

const BUCKET_OFFSET_MS: Record<string, number> = {
  now: 0,
  tonight: 6 * 3600_000,
  weekend: 2 * 86400_000,
  next_week: 7 * 86400_000,
  next_month: 25 * 86400_000,
  someday: 120 * 86400_000,
  earlier: -30 * 86400_000,
};

export function personTemporalContext(
  name: string,
  opts?: { founderSeedEnabled?: boolean },
): PersonTemporalContext | null {
  const seedOn =
    typeof opts?.founderSeedEnabled === "boolean"
      ? opts.founderSeedEnabled
      : isFounderSeedEnabled();
  if (!seedOn) return null;
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return PERSON_TEMPORAL_SEED[key] || null;
}

/** Next 3 upcoming + next open loop for a person node (seed/lab only). */
export function personNodeTemporal(
  name: string,
  opts?: { founderSeedEnabled?: boolean },
): {
  upcomingPlans: PersonUpcomingPlan[];
  nextOpenLoop: PersonOpenLoop | null;
} {
  const ctx = personTemporalContext(name, opts);
  return {
    upcomingPlans: (ctx?.upcomingPlans || []).slice(0, 3),
    nextOpenLoop: ctx?.nextOpenLoop || null,
  };
}

export type LiveGraphLike = {
  id: string;
  title: string;
  whenLine: string;
  signalLine: string;
  status: string;
  person?: string;
  startsAt?: string | null;
  who?: string[];
};

/** Honest when-label from the canonical instant — always carries AM/PM (F12-01/F12-10). */
function startsAtLabel(startsAt: string | null | undefined): string {
  if (!startsAt) return "Time to be set";
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return "Time to be set";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / DAY_MS);
  const clock = formatClockAmPm(d);
  if (diff === 0) return `Today · ${clock}`;
  if (diff === 1) return `Tomorrow · ${clock}`;
  if (diff > 1 && diff < 7)
    return `${d.toLocaleDateString(undefined, { weekday: "long" })} · ${clock}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${clock}`;
}

export function liveGraphsToTimelineItems(
  live: LiveGraphLike[],
  nowMs = Date.now(),
): TimelineItem[] {
  return live.map((g) => {
    const bucket = bucketFromLive(g, nowMs);
    const who =
      g.who && g.who.length
        ? g.who
        : g.person
          ? [g.person]
          : g.signalLine
            ? [g.signalLine.split("·")[0]?.trim() || "Friends"].filter(Boolean)
            : ["Friends"];
    return {
      id: g.id,
      title: g.title,
      // F12-01/F12-45: derive from the canonical instant; a time label is never
      // a person's name and never the vague "Soon".
      whenLabel: g.whenLine || startsAtLabel(g.startsAt),
      who,
      where: g.title,
      status: g.status,
      bucket,
      groupSize: Math.max(2, who.length),
      closeness: 0.85,
      startsAt: g.startsAt || undefined,
      source: "live" as const,
    };
  });
}

function bucketFromLive(g: LiveGraphLike, nowMs: number): TimelineBucket {
  if (g.status === "past") return "earlier";
  if (/tonight/i.test(g.whenLine)) return "tonight";
  if (/weekend|saturday|sunday/i.test(g.whenLine)) return "weekend";
  if (/next week/i.test(g.whenLine)) return "next_week";
  if (/month/i.test(g.whenLine)) return "next_month";
  const start = g.startsAt ? Date.parse(g.startsAt) : NaN;
  // F12-47: a dateless plan is "someday" - never imply next week.
  if (!Number.isFinite(start)) return "someday";
  const delta = start - nowMs;
  if (delta < 18 * 3600_000) return "tonight";
  if (delta < 3 * 86400_000) return "weekend";
  if (delta < 10 * 86400_000) return "next_week";
  if (delta < 40 * 86400_000) return "next_month";
  return "someday";
}

export function timelineItemStartMs(item: TimelineItem, nowMs = Date.now()): number | null {
  if (item.startsAt) {
    const t = Date.parse(item.startsAt);
    if (Number.isFinite(t)) return t;
  }
  const offset = BUCKET_OFFSET_MS[item.bucket];
  if (typeof offset !== "number") return null;
  return nowMs + offset;
}

/** Keep dated upcoming inside the window; always keep someday + earlier. */
export function filterTimelineByRangeDays(
  items: TimelineItem[],
  days: 30 | 90,
  nowMs = Date.now(),
): TimelineItem[] {
  const horizon = nowMs + days * 86400_000;
  return items.filter((item) => {
    if (item.bucket === "someday" || item.bucket === "earlier") return true;
    const start = timelineItemStartMs(item, nowMs);
    if (start == null) return days === 90;
    // Past-dated non-earlier rows stay out of the upcoming window.
    if (start < nowMs - 12 * 3600_000) return false;
    return start <= horizon;
  });
}

export function isFutureTimelineItem(item: TimelineItem): boolean {
  return item.bucket !== "earlier" && item.status !== "past";
}

export function withSeedStartsAt(
  items: TimelineItem[],
  nowMs = Date.now(),
): TimelineItem[] {
  return items.map((item) => {
    if (item.startsAt) return { ...item, source: item.source || "seed" };
    const ms = timelineItemStartMs(item, nowMs);
    return {
      ...item,
      source: item.source || "seed",
      startsAt: ms != null ? new Date(ms).toISOString() : item.startsAt,
    };
  });
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Opt-in calendar file. Never auto-writes to a system calendar. */
export function buildPlanIcs(item: TimelineItem, nowMs = Date.now()): string {
  const start = timelineItemStartMs(item, nowMs) ?? nowMs + 86400_000;
  const end = start + 90 * 60_000;
  const who = item.who.length ? item.who.join(", ") : "friends";
  const desc = `With ${who}${item.where ? ` · ${item.where}` : ""}\nFrom Opal`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Opal//Graph Timeline//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:opal-${item.id}@opal.app`,
    `DTSTAMP:${toIcsUtc(nowMs)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${icsEscape(item.title)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    item.where ? `LOCATION:${icsEscape(item.where)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadPlanIcs(item: TimelineItem): void {
  if (typeof document === "undefined") return;
  const body = buildPlanIcs(item);
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${item.title.replace(/[^\w]+/g, "-").slice(0, 40) || "opal-plan"}.ics`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
