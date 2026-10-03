/**
 * Settled plans leave the message plane. The header strip reads the current
 * SharedPlan. The history line is the frozen plan_set_event, never the live lines.
 *
 * Temporal helpers keep PAST_PLAN_AS_NEXT_TOGETHER / UPCOMING_READY /
 * FUTURE_EXECUTION_CTA at zero when the canonical start is already past.
 */

export type PlanView = {
  commitment?: string | null;
  change_quiet?: boolean;
  plan_lines?: string[] | null;
  change_proposal?: { value?: string | null } | null;
  plan_set_event?: { summary?: string | null; at?: string | null } | null;
  temporal_state?: string | null;
  next_together_eligible?: boolean | null;
  upcoming_ready?: boolean | null;
  future_execution_actionable?: boolean | null;
  canonical_start_at?: string | null;
  reservation_authorizable?: boolean | null;
  date?: { resolved_on?: string | null; timezone?: string | null } | null;
  exact_time?: { value?: string | null } | null;
  plan_timezone?: string | null;
};

export type ParticipantMode = "solo" | "dyad" | "group";

export type ThreadItem<T> =
  | { kind: "message"; message: T }
  | { kind: "plan-set"; summary: string; at?: string };

/** Graph / chats presentation. "past" is historical — not upcoming Ready. */
export type PlanSurfaceState = "ready" | "action" | "forming" | "past";

export type PlanTemporalState = "future" | "approaching" | "live" | "past";

const APPROACHING_MS = 90 * 60 * 1000;
const LIVE_WINDOW_MS = 180 * 60 * 1000;

export function isSettledPlan(plan: PlanView | null | undefined): boolean {
  if (!plan?.change_quiet || !plan.plan_lines?.length) return false;
  return plan.commitment === "aligned" || plan.commitment === "execution_ready";
}

export function nextPlanKicker(mode: ParticipantMode, summary: string): string {
  if (/\btonight\b/i.test(summary)) return "TONIGHT";
  if (mode === "solo") return "NEXT";
  return "NEXT TOGETHER";
}

/** Historical strip kicker — never "NEXT TOGETHER" for past. */
export function pastPlanKicker(mode: ParticipantMode): string {
  if (mode === "solo") return "EARLIER";
  return "EARLIER TOGETHER";
}

export function nextPlanSummary(lines: string[] | null | undefined): string {
  return (lines || []).map((line) => line.trim()).filter(Boolean).join(" · ");
}

export function parseExactTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = value.trim().toUpperCase().replace(/\s+/g, " ");
  const ampm = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2] || "0");
    const ap = ampm[3];
    if (ap === "AM") hour = hour === 12 ? 0 : hour;
    if (ap === "PM") hour = hour === 12 ? 12 : hour + 12;
    return hour * 60 + minute;
  }
  const hm = text.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const hour = Number(hm[1]);
    const minute = Number(hm[2]);
    if (hour >= 0 && hour <= 23) return hour * 60 + minute;
  }
  return null;
}

/**
 * Resolve canonical start. Prefers ISO canonical_start_at, else
 * resolvedOn + exactTime in timezone (fixed Pacific offset when needed).
 */
export function resolveCanonicalStart(input: {
  canonicalStartAt?: string | null;
  resolvedOn?: string | null;
  exactTime?: string | null;
  timezone?: string | null;
  startAt?: string | null;
}): Date | null {
  if (input.canonicalStartAt) {
    const ms = Date.parse(input.canonicalStartAt);
    if (!Number.isNaN(ms)) return new Date(ms);
  }
  if (input.resolvedOn) {
    const minutes = parseExactTimeToMinutes(input.exactTime) ?? 12 * 60;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const offsetHours = pacificOffsetHours(input.resolvedOn, input.timezone);
    // Wall clock in zone → UTC: UTC = local - offset (offset negative west).
    const iso = `${input.resolvedOn}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
    const asUtc = Date.parse(`${iso}Z`);
    if (!Number.isNaN(asUtc)) {
      return new Date(asUtc - offsetHours * 3600 * 1000);
    }
  }
  if (input.startAt) {
    const ms = Date.parse(input.startAt);
    if (!Number.isNaN(ms)) return new Date(ms);
  }
  return null;
}

function pacificOffsetHours(resolvedOn: string, timezone?: string | null): number {
  const tz = timezone || "America/Los_Angeles";
  if (tz === "UTC" || tz === "Etc/UTC") return 0;
  const month = Number(resolvedOn.slice(5, 7));
  const dst = month >= 3 && month <= 10;
  if (tz.includes("Los_Angeles") || tz.includes("Pacific")) return dst ? -7 : -8;
  if (tz.includes("New_York") || tz.includes("Eastern")) return dst ? -4 : -5;
  return 0;
}

export function classifyPlanTemporal(
  start: Date | null,
  now: Date = new Date(),
  opts?: { canceled?: boolean; superseded?: boolean },
): PlanTemporalState | null {
  if (opts?.canceled || opts?.superseded) return "past";
  if (!start) return null;
  const delta = start.getTime() - now.getTime();
  if (delta > APPROACHING_MS) return "future";
  if (delta > 0) return "approaching";
  if (delta > -LIVE_WINDOW_MS) return "live";
  return "past";
}

export function isPlanPast(input: {
  temporalState?: string | null;
  canonicalStartAt?: string | null;
  resolvedOn?: string | null;
  exactTime?: string | null;
  timezone?: string | null;
  startAt?: string | null;
  now?: Date;
}): boolean {
  if (input.temporalState === "past") return true;
  if (input.temporalState && input.temporalState !== "past") return false;
  const start = resolveCanonicalStart(input);
  return classifyPlanTemporal(start, input.now ?? new Date()) === "past";
}

export function nextTogetherEligible(
  inputOrPlan:
    | PlanView
    | {
        temporalState?: string | null;
        nextTogetherEligible?: boolean | null;
        commitment?: string | null;
        canceled?: boolean;
        superseded?: boolean;
        canonicalStartAt?: string | null;
        resolvedOn?: string | null;
        exactTime?: string | null;
        timezone?: string | null;
        startAt?: string | null;
        now?: Date;
      }
    | null
    | undefined,
  now?: Date,
): boolean {
  if (!inputOrPlan) return false;
  const input = normalizePlanInput(inputOrPlan, now);
  if (typeof input.nextTogetherEligible === "boolean") return input.nextTogetherEligible;
  if (!isSettledPlan(inputOrPlan as PlanView) && !(inputOrPlan as PlanView).plan_lines) {
    // object-form callers without plan_lines still evaluate temporal
  } else if (!isSettledPlan(inputOrPlan as PlanView) && (inputOrPlan as PlanView).change_quiet != null) {
    return false;
  }
  if (input.canceled || input.superseded) return false;
  if (input.commitment && ["canceled", "cancelled", "superseded"].includes(input.commitment)) {
    return false;
  }
  const temporal =
    (input.temporalState as PlanTemporalState | null | undefined) ||
    classifyPlanTemporal(resolveCanonicalStart(input), input.now ?? new Date(), {
      canceled: input.canceled,
      superseded: input.superseded,
    });
  if (!temporal || temporal === "past") return false;
  return true;
}

/** Compatibility: PlanView → temporal state for OpalApp / tests. */
export function planTemporalState(
  plan: PlanView | null | undefined,
  now: Date = new Date(),
): PlanTemporalState | "unknown" {
  if (!plan) return "unknown";
  if (
    plan.temporal_state === "future" ||
    plan.temporal_state === "approaching" ||
    plan.temporal_state === "live" ||
    plan.temporal_state === "past"
  ) {
    return plan.temporal_state;
  }
  const start = resolveCanonicalStart(normalizePlanInput(plan, now));
  return classifyPlanTemporal(start, now) || "unknown";
}

function normalizePlanInput(
  plan: PlanView | Record<string, unknown>,
  now?: Date,
): {
  temporalState?: string | null;
  nextTogetherEligible?: boolean | null;
  commitment?: string | null;
  canceled?: boolean;
  superseded?: boolean;
  canonicalStartAt?: string | null;
  resolvedOn?: string | null;
  exactTime?: string | null;
  timezone?: string | null;
  startAt?: string | null;
  now?: Date;
  change_quiet?: boolean;
  plan_lines?: string[] | null;
} {
  const p = plan as PlanView & Record<string, unknown>;
  if ("resolvedOn" in p || "temporalState" in p || "canonicalStartAt" in p) {
    return { ...(p as object), now: now ?? (p as { now?: Date }).now } as ReturnType<
      typeof normalizePlanInput
    >;
  }
  const date = (p.date || {}) as { resolved_on?: string | null; timezone?: string | null };
  const exact = (p.exact_time || {}) as { value?: string | null };
  return {
    temporalState: p.temporal_state,
    nextTogetherEligible: p.next_together_eligible,
    commitment: p.commitment,
    canonicalStartAt: p.canonical_start_at,
    resolvedOn: date.resolved_on,
    exactTime: exact.value,
    timezone: p.plan_timezone || date.timezone,
    now,
    change_quiet: p.change_quiet,
    plan_lines: p.plan_lines,
  };
}

export function futureExecutionActionable(input: {
  temporalState?: string | null;
  futureExecutionActionable?: boolean | null;
  reservationAuthorizable?: boolean | null;
  canonicalStartAt?: string | null;
  resolvedOn?: string | null;
  exactTime?: string | null;
  timezone?: string | null;
  startAt?: string | null;
  now?: Date;
}): boolean {
  if (typeof input.futureExecutionActionable === "boolean") {
    return input.futureExecutionActionable;
  }
  if (isPlanPast(input)) return false;
  const temporal =
    (input.temporalState as PlanTemporalState | null | undefined) ||
    classifyPlanTemporal(resolveCanonicalStart(input), input.now ?? new Date());
  if (temporal === "live" || temporal === "past" || !temporal) return false;
  return input.reservationAuthorizable !== false;
}

/** Graph status from the shared plan. Color follows this state, not the venue. */
export function planSurfaceState(input: {
  commitment?: string | null;
  pendingChange?: boolean;
  needsViewer?: boolean;
  temporalState?: string | null;
  upcomingReady?: boolean | null;
  canonicalStartAt?: string | null;
  resolvedOn?: string | null;
  exactTime?: string | null;
  timezone?: string | null;
  startAt?: string | null;
  now?: Date;
}): PlanSurfaceState {
  if (isPlanPast(input) || input.temporalState === "past") return "past";
  if (input.needsViewer) return "action";
  if (input.pendingChange) return "forming";
  if (input.commitment === "execution_ready" || input.commitment === "aligned") {
    if (input.upcomingReady === false) return "past";
    return "ready";
  }
  return "forming";
}

export function planConsequenceLabel(input: {
  state: PlanSurfaceState;
  whenLabel?: string | null;
  place?: string | null;
  pendingProposalValue?: string | null;
}): string {
  const pending = (input.pendingProposalValue || "").trim();
  if (pending && (input.state === "forming" || input.state === "action")) {
    return `${pending} proposed`;
  }
  if (input.state === "action") return "Action · Needs a response";
  if (input.state === "forming") return "Forming";
  if (input.state === "past") {
    const when = (input.whenLabel || "").replace(/\bTuesday\b/g, "Tue").replace(/ · /g, " ");
    return [when, input.place || ""].filter(Boolean).join(" · ") || "Earlier together";
  }
  const when = (input.whenLabel || "").replace(/\bTuesday\b/g, "Tue").replace(/ · /g, " ");
  return ["Ready", when, input.place || ""].filter(Boolean).join(" · ");
}

export function selectHeaderPlan(lines: string[] | null | undefined): {
  summary: string;
  moreCount: number;
} | null {
  const summary = nextPlanSummary(lines);
  if (!summary) return null;
  return { summary, moreCount: 0 };
}

export function planHistory(plan: PlanView | null | undefined): { summary: string; at?: string } | null {
  const summary = plan?.plan_set_event?.summary?.trim();
  if (!summary) return null;
  return {
    summary,
    at: plan?.plan_set_event?.at || undefined,
  };
}

export function interleavePlanHistory<T extends { createdAt?: string }>(
  messages: T[],
  event: { summary: string; at?: string } | null,
): ThreadItem<T>[] {
  if (!event) return messages.map((message) => ({ kind: "message", message }));
  const at = event.at ? Date.parse(event.at) : NaN;
  const items: ThreadItem<T>[] = [];
  let placed = false;
  for (const message of messages) {
    const created = message.createdAt ? Date.parse(message.createdAt) : NaN;
    if (!placed && !Number.isNaN(at) && !Number.isNaN(created) && created > at) {
      items.push({ kind: "plan-set", summary: event.summary, at: event.at });
      placed = true;
    }
    items.push({ kind: "message", message });
  }
  if (!placed) items.push({ kind: "plan-set", summary: event.summary, at: event.at });
  return items;
}
