/**
 * Repair #19 polish - Cluster H (P11) + P12: THE DENSITY CONSTITUTION.
 *
 * One derivation module for time density across every plan surface.
 * Surfaces render what these functions project; no component counts,
 * buckets, or weighs a plan on its own (one explicit projection per
 * surface - this module is that projection's time grammar).
 *
 * THE ONE BUCKET SYSTEM (past and future are symmetric):
 *   past:    year pill (older than 12 months) / month pill (within
 *            the last 12 months) - collapsed by default, always.
 *   future:  today (same calendar day) / week (1-7 days out) /
 *            month (8-30 days out) / far - the horizon band
 *            (31+ days out), a distant stone: summarized, quiet,
 *            never competing with tonight.
 * Presence weight follows nearness: far 0.25 (distant), month 0.5
 * (quiet), week 0.75 (present), today/happening 1 (full). A plan
 * MIGRATES far -> month -> week -> today as its start crosses the
 * thresholds; the weight class is stamped on the card by the
 * projection, so migration is a projection fact, not a component
 * improvisation. Dates are read from the plan record's own start_at
 * (falling back to completed_at / created_at for past records);
 * a plan with no real date carries no band and no weight - it is
 * never assigned a bucket by guessing.
 *
 * INVITATION HYGIENE: a plan the viewer declined (viewer_state
 * canonical "declined"/"withdrawn") or whose status is "expired"
 * SETTLES: it leaves every actionable list and appears only as one
 * summarized line in the viewer's own history. The line is private
 * to the viewer - no other surface is fed by this derivation, so
 * no decline is ever announced to anyone else.
 */
import type { OpalPlanContract } from "../../api/productClient";
import type { PlanCardC2Input } from "../PlanCardC2";

export type TimeBand = "today" | "week" | "month" | "far";
export type PresenceWeightClass = "full" | "present" | "quiet" | "distant";

export type PresenceStamp = {
  band: TimeBand;
  weightClass: PresenceWeightClass;
  /** 0.25 distant / 0.5 quiet / 0.75 present / 1 full. */
  weight: number;
};

const DAY_MS = 86_400_000;

export function parsePlanDate(value?: string | null): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole calendar days from `now`'s day to `date`'s day (UTC). */
export function calendarDayDiff(now: Date, date: Date): number {
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const b = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((b - a) / DAY_MS);
}

export function bandForStart(start: Date, now: Date): TimeBand {
  const d = calendarDayDiff(now, start);
  if (d <= 0) return "today";
  if (d <= 7) return "week";
  if (d <= 30) return "month";
  return "far";
}

export const PRESENCE_BY_BAND: Record<TimeBand, PresenceStamp> = {
  today: { band: "today", weightClass: "full", weight: 1 },
  week: { band: "week", weightClass: "present", weight: 0.75 },
  month: { band: "month", weightClass: "quiet", weight: 0.5 },
  far: { band: "far", weightClass: "distant", weight: 0.25 },
};

/** The presence stamp for a plan, from its record's real start_at.
 *  Null when the record carries no parseable start - no band is
 *  ever invented from a time_label string. */
export function presenceForPlan(plan: OpalPlanContract, now: Date): PresenceStamp | null {
  const start = parsePlanDate(plan.start_at);
  if (!start) return null;
  return PRESENCE_BY_BAND[bandForStart(start, now)];
}

/** Milestone rule (P12-4): a far-band plan may surface proactively
 *  ONLY on a milestone - it needs the viewer's answer (a decision),
 *  or it is missing exactly the kind of slot the viewer can supply.
 *  Ready/forming far plans with nothing needed stay quiet. This is
 *  the web mirror of the gate in the backend Reveal derivation. */
export function farBandMilestone(plan: OpalPlanContract, now: Date): boolean {
  const stamp = presenceForPlan(plan, now);
  if (!stamp || stamp.band !== "far") return true; // not far: rule does not apply
  const viewer = (plan.viewer_state ?? "").toLowerCase();
  if (viewer === "pending") return true; // decision needed from the viewer
  return false;
}

// ------------------------------------------------------------------
// Settled invitations
// ------------------------------------------------------------------

export type SettledKind = "declined" | "expired";

/** Why a plan settles for this viewer, or null when it stays live.
 *  Declined is checked first: a declined plan that also ended is
 *  still the viewer's settled answer, not a fresh past plan. */
export function settledKindForPlan(plan: OpalPlanContract): SettledKind | null {
  const viewer = (plan.viewer_state ?? "").toLowerCase();
  if (viewer === "declined" || viewer === "withdrawn") return "declined";
  if ((plan.status ?? "").toLowerCase() === "expired") return "expired";
  return null;
}

export type SettledInvitation = {
  id: string;
  title: string;
  kind: SettledKind;
  /** The one summarized history line, in plain words. */
  line: string;
};

export function settledInvitationForPlan(plan: OpalPlanContract): SettledInvitation | null {
  const kind = settledKindForPlan(plan);
  if (!kind) return null;
  return {
    id: plan.id,
    title: plan.title,
    kind,
    line:
      kind === "declined"
        ? `${plan.title} - settled. You said you could not make it.`
        : `${plan.title} - settled. It passed without an answer.`,
  };
}

/**
 * COOLING (P11 novelty S2, coordinated with Cluster I's P14 LIMBO):
 * cooling and limbo are ONE physics. An unanswered invitation cools
 * as it ages - warm when fresh, cooling as its start nears, and
 * LIMBO is the ruled past-grace segment of that same cooling: the
 * start has passed, no answer came, and the invitation rests in
 * amber cooling toward muted (its own pattern channel; explicitly
 * NOT action red - red is spent only on a live action state). When
 * limbo ends (the record expires, or the viewer answers no), the
 * invitation SETTLES - the settled line above is exactly cooling's
 * end-state, so a user learns one cooling language, not two.
 */
export type InvitationTemperature = "warm" | "cooling" | "limbo" | "settled";

export function invitationTemperature(
  plan: OpalPlanContract,
  now: Date,
): InvitationTemperature | null {
  if (settledKindForPlan(plan)) return "settled";
  const viewer = (plan.viewer_state ?? "").toLowerCase();
  if (viewer !== "pending") return null; // not an open invitation to this viewer
  const start = parsePlanDate(plan.start_at);
  if (!start) return "warm";
  const d = calendarDayDiff(now, start);
  if (d < 0) return "limbo"; // past its start, still unanswered - past-grace
  if (d <= 7) return "cooling";
  return "warm";
}

// ------------------------------------------------------------------
// Past as a pill (Quiet Ledger expansion)
// ------------------------------------------------------------------

export type PastPillCard = PlanCardC2Input & {
  id: string;
  /** Carried through from the list adapter's card (Drop-it derivation). */
  droppable?: boolean;
};

export type PastPill = {
  /** "2026-10" for a month pill, "2025" for a year pill. */
  id: string;
  /** "October 2026" / "2025" - finished by this derivation. */
  periodLabel: string;
  count: number;
  /** Up to three real plan titles from the period, newest first. */
  highlights: string[];
  /** The period's cards, newest first, for intent expansion. */
  cards: PastPillCard[];
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The date a past record settles by: its start, else when it
 *  completed, else when it was created. Null = undated. */
export function pastDateForPlan(plan: OpalPlanContract): Date | null {
  return (
    parsePlanDate(plan.start_at) ??
    parsePlanDate(plan.completed_at) ??
    parsePlanDate(plan.created_at)
  );
}

/**
 * Collapse past cards into pills. Within the last 12 months a pill
 * is a month; older, a pill is a year. Undated past cards settle
 * into one honest pill labelled "Earlier" - they are never assigned
 * a month they did not happen in. Pills order newest period first;
 * cards inside a pill order newest first when their dates are known.
 */
export function pastPillsFromEntries(
  entries: Array<{ card: PastPillCard; date: Date | null }>,
  now: Date,
): PastPill[] {
  const byKey = new Map<string, { pill: PastPill; sortKey: number; dated: Array<{ card: PastPillCard; t: number }> }>();
  const monthCutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1);
  for (const entry of entries) {
    const d = entry.date;
    let id: string;
    let label: string;
    let sortKey: number;
    if (!d) {
      id = "earlier";
      label = "Earlier";
      sortKey = -1;
    } else if (d.getTime() >= monthCutoff) {
      id = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      label = `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      sortKey = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    } else {
      id = `${d.getUTCFullYear()}`;
      label = `${d.getUTCFullYear()}`;
      sortKey = Date.UTC(d.getUTCFullYear(), 0, 1);
    }
    let bucket = byKey.get(id);
    if (!bucket) {
      bucket = { pill: { id, periodLabel: label, count: 0, highlights: [], cards: [] }, sortKey, dated: [] };
      byKey.set(id, bucket);
    }
    bucket.dated.push({ card: entry.card, t: d ? d.getTime() : 0 });
  }
  const pills = [...byKey.values()].sort((a, b) => b.sortKey - a.sortKey);
  for (const bucket of pills) {
    bucket.dated.sort((a, b) => b.t - a.t);
    bucket.pill.cards = bucket.dated.map((x) => x.card);
    bucket.pill.count = bucket.pill.cards.length;
    bucket.pill.highlights = bucket.pill.cards.slice(0, 3).map((c) => c.title);
  }
  return pills.map((b) => b.pill);
}

/** Fallback for projections built outside graphListFromPlans (other
 *  clusters' fixtures): collapse a past group's cards into pills
 *  with no dates - one "Earlier" pill, never an invented month. */
export function pastPillsFromCards(cards: PastPillCard[], now: Date): PastPill[] {
  return pastPillsFromEntries(cards.map((card) => ({ card, date: null })), now);
}

// ------------------------------------------------------------------
// Preparation spine (P12-3)
// ------------------------------------------------------------------

export type SpinePhase = "intent" | "preparation" | "event" | "settling";
export type SpineOwner = "you" | "opal" | "agent";
export type SpineState = "done" | "working" | "needs-you" | "waiting" | "declared";

export type SpineItem = {
  id: string;
  phase: SpinePhase;
  /** Finished plain label. */
  label: string;
  state: SpineState;
  /** Finished state line, e.g. "Done - Opal put it on your calendar." */
  stateLine: string;
  owner: SpineOwner;
  /** Finished owner line: "Yours" / "Opal" / "An agent, only with your approval". */
  ownerLine: string;
  /** Position on the arc, 0 (intent) to 1 (settling), finished here. */
  arcPosition: number;
};

const OWNER_LINE: Record<SpineOwner, string> = {
  you: "Yours to do",
  opal: "Opal",
  agent: "An agent, only with your approval",
};

/**
 * The spine projection: INTENT -> PREPARATION -> THE EVENT ->
 * SETTLING INTO MEMORY, built ONLY from records the plan already
 * carries - its completion record (the R16 PlanCompletion steps,
 * persisted on the plan), its missing-slot fact, its participant
 * answers (from the plan-history projection), and its own state.
 * No item is invented: a step renders only when the completion
 * record carries it, its state is the record's own status mapped
 * to spine language, and anything Opal cannot actually execute
 * (a booking, a ride) renders as a user action or a declared gap -
 * never as a simulated completion.
 */
export function spineFromPlan(input: {
  plan: OpalPlanContract;
  /** The detail's Who rows (finished response labels), when read. */
  who?: Array<{ name: string; responseLabel: string }>;
  missingSlotLabel?: string | null;
}): SpineItem[] {
  const { plan } = input;
  const items: SpineItem[] = [];
  const familyPast = ["completed", "expired", "cancelled", "settled", "ended"].includes(
    (plan.status ?? "").toLowerCase(),
  );

  items.push({
    id: "intent",
    phase: "intent",
    label: `The plan - ${plan.title}`,
    state: "done",
    stateLine: "Settled as a plan. The intent is on the graph.",
    owner: "you",
    ownerLine: OWNER_LINE.you,
    arcPosition: 0,
  });

  const steps = plan.completion?.steps ?? [];
  const stepState = (status: string): { state: SpineState; line: string } => {
    const s = status.toLowerCase();
    if (["projected", "ready", "done", "completed", "set", "active"].includes(s))
      return { state: "done", line: "Done" };
    if (["queued", "running", "searching", "results_ready"].includes(s))
      return { state: "working", line: "Opal is working on it" };
    if (s.startsWith("skipped")) return { state: "declared", line: "Not needed for this plan" };
    if (s === "failed") return { state: "declared", line: "Opal could not do this - it is yours if you want it" };
    return { state: "waiting", line: "Waiting" };
  };
  // The completion record's own step ids, in the record's order.
  // Known ids get human labels; an unknown id renders its record
  // name plainly rather than being dropped or renamed by a guess.
  const STEP_LABEL: Record<string, { label: string; owner: SpineOwner }> = {
    calendar: { label: "On your calendar", owner: "opal" },
    restaurants: { label: "Find a place to eat", owner: "opal" },
    food: { label: "Food for the group", owner: "you" },
    ride: { label: "Arrange a ride", owner: "you" },
    directions: { label: "Directions to the place", owner: "opal" },
    join_link: { label: "Meeting link ready", owner: "opal" },
    follow_through: { label: "Opal keeps watch as it nears", owner: "opal" },
    coming_up: { label: "Waiting on your home and graphs", owner: "opal" },
    proactive_anchor: { label: "A thread with Opal about this plan", owner: "agent" },
    checkin: { label: "Check in with your people", owner: "you" },
  };
  steps.forEach((step, i) => {
    const known = STEP_LABEL[step.id];
    const mapped = stepState(String(step.status ?? ""));
    items.push({
      id: `step-${step.id}`,
      phase: "preparation",
      label: known?.label ?? step.id,
      state: mapped.state,
      stateLine: mapped.line,
      owner: known?.owner ?? "opal",
      ownerLine: OWNER_LINE[known?.owner ?? "opal"],
      arcPosition: 0.15 + (0.5 * (i + 1)) / Math.max(steps.length + 1, 2),
    });
  });

  if (input.missingSlotLabel) {
    items.push({
      id: "missing-slot",
      phase: "preparation",
      label: input.missingSlotLabel,
      state: "needs-you",
      stateLine: "Needs you - this one thing is still open",
      owner: "you",
      ownerLine: OWNER_LINE.you,
      arcPosition: 0.6,
    });
  }

  const waiting = (input.who ?? []).filter((p) => p.responseLabel === "Waiting to answer");
  if (waiting.length > 0) {
    items.push({
      id: "answers",
      phase: "preparation",
      label: `Answers from ${waiting.map((p) => p.name).join(", ")}`,
      state: "waiting",
      stateLine: "Waiting - their answer is theirs to give",
      owner: "you",
      ownerLine: "Theirs to answer",
      arcPosition: 0.65,
    });
  }

  return spineTail(items, plan, familyPast);
}

/** Fold the Who rows' waiting answers into an already-projected
 *  spine (the detail adapter's history leg). Inserts the answers
 *  item ahead of the event item; a spine that already carries one
 *  (projected with who rows) is returned unchanged. */
export function foldSpineAnswers(
  spine: SpineItem[] | undefined,
  who: Array<{ name: string; responseLabel: string }>,
): SpineItem[] | undefined {
  if (!spine) return spine;
  if (spine.some((i) => i.id === "answers")) return spine;
  const waiting = who.filter((p) => p.responseLabel === "Waiting to answer");
  if (waiting.length === 0) return spine;
  const answers: SpineItem = {
    id: "answers",
    phase: "preparation",
    label: `Answers from ${waiting.map((p) => p.name).join(", ")}`,
    state: "waiting",
    stateLine: "Waiting - their answer is theirs to give",
    owner: "you",
    ownerLine: "Theirs to answer",
    arcPosition: 0.65,
  };
  const at = spine.findIndex((i) => i.id === "event");
  return at < 0 ? [...spine, answers] : [...spine.slice(0, at), answers, ...spine.slice(at)];
}

function spineTail(
  items: SpineItem[],
  plan: OpalPlanContract,
  familyPast: boolean,
): SpineItem[] {
  items.push({
    id: "event",
    phase: "event",
    label: plan.time_label?.trim() ? `${plan.title} - ${plan.time_label.trim()}` : plan.title,
    state: familyPast ? "done" : "waiting",
    stateLine: familyPast ? "It happened" : "The event itself",
    owner: "you",
    ownerLine: OWNER_LINE.you,
    arcPosition: 0.85,
  });

  items.push({
    id: "settling",
    phase: "settling",
    label: "Settles into memory",
    state: familyPast ? "done" : "waiting",
    stateLine: familyPast
      ? "Settled - it rests in your past as a pill, not a scroll."
      : "Afterwards it settles into your past, quietly.",
    owner: "opal",
    ownerLine: OWNER_LINE.opal,
    arcPosition: 1,
  });

  return items;
}
