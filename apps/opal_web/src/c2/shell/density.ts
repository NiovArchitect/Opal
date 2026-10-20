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

/**
 * R20 F-14 - THE shared plan time-range rendering. One formatter owns
 * the when line for every surface (cards, detail header, strips,
 * deck - all of them read the card this module's consumers build):
 *
 *  - same-day (or no real end, or an end not after the start): the
 *    record's own `time_label`, verbatim - the format does not change.
 *  - multi-day (the record's `end_at` falls on a different calendar
 *    day than `start_at`, in the plan's own timezone): start AND end
 *    render - "<time_label> - Mon Jan 4". With no time_label the
 *    start is formatted from its instant the same short way, with
 *    its time: "Sat Jan 2, 7 PM - Mon Jan 4".
 *
 * Days are compared in the plan's timezone (the contract's own
 * `timezone`, falling back to UTC) - a plan that ends after midnight
 * local is multi-day even when UTC would call it same-day.
 */
const RANGE_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RANGE_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dayPartsInZone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; weekday: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    const year = Number(get("year"));
    const month = Number(get("month"));
    const day = Number(get("day"));
    if (!year || !month || !day || weekday < 0) return null;
    return { year, month, day, weekday };
  } catch {
    return null;
  }
}

function shortDayLabel(date: Date, timeZone: string): string {
  const p = dayPartsInZone(date, timeZone);
  if (!p) return "";
  return `${RANGE_WEEKDAYS[p.weekday]} ${RANGE_MONTHS[p.month - 1]} ${p.day}`;
}

function shortTimeLabel(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const hour = get("hour");
    const minute = get("minute");
    const period = get("dayPeriod");
    if (!hour || !period) return "";
    return minute && minute !== "00" ? `${hour}:${minute} ${period}` : `${hour} ${period}`;
  } catch {
    return "";
  }
}

export function planWhenLine(plan: OpalPlanContract): string {
  const label = plan.time_label?.trim() ? plan.time_label.trim() : null;
  const start = parsePlanDate(plan.start_at);
  const end = parsePlanDate(plan.end_at);
  const timeZone =
    typeof plan.timezone === "string" && plan.timezone.trim() ? plan.timezone.trim() : "UTC";

  if (start && end && end.getTime() > start.getTime()) {
    const s = dayPartsInZone(start, timeZone);
    const e = dayPartsInZone(end, timeZone);
    const multiDay =
      s && e ? s.year !== e.year || s.month !== e.month || s.day !== e.day : false;
    if (multiDay) {
      const endLabel = shortDayLabel(end, timeZone);
      if (label) return `${label} - ${endLabel}`;
      const startLabel = shortDayLabel(start, timeZone);
      const startTime = shortTimeLabel(start, timeZone);
      return startTime ? `${startLabel}, ${startTime} - ${endLabel}` : `${startLabel} - ${endLabel}`;
    }
  }

  if (label) return label;
  return "Time not set yet.";
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
  /** The settled line, in plain words. R20 F-12: this line lives in
   *  the plan's own DETAIL (reachable on intent) - it is never
   *  rendered as a standalone row in any list surface. */
  line: string;
  /** R20 F-12: the settled plan's own card (past family, "Settled"
   *  label), built by the one adapter. List surfaces show settled
   *  outcomes ONLY through the settled summary below; expanding the
   *  summary by intent reveals these cards. */
  card?: PastPillCard;
};

/**
 * R20 F-12 - THE settled summary line: the single quiet line a list
 * surface may show for ALL of the viewer's settled outcomes. One
 * line total, however many plans settled - the per-plan rows that
 * read as shouting ("Farmers market run - Settled - You said you
 * could not make it", repeated) are gone from every list. The
 * per-plan truth stays reachable: expand the summary for the cards,
 * open a card for its detail and its settled line.
 */
export function settledSummaryLine(items: SettledInvitation[]): string {
  const declined = items.filter((i) => i.kind === "declined").length;
  const expired = items.length - declined;
  const parts: string[] = [];
  if (declined > 0) {
    parts.push(declined === 1 ? "1 you could not make" : `${declined} you could not make`);
  }
  if (expired > 0) {
    parts.push(
      expired === 1
        ? "1 that passed without an answer"
        : `${expired} that passed without an answer`,
    );
  }
  return `Settled quietly - ${parts.join(", ")}.`;
}

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
 *
 * R20A CF (R-6a) WINDOW LAW: cooling/limbo are WINDOW states, not
 * plan states. A merely-pending plan - however close its start -
 * is warm, never cooling and never limbo, unless the backend's one
 * etiquette projection says a real answer window exists for it:
 * either the limbo segment itself (etiquette.limbo.state "limbo",
 * the backend's past-grace ruling) or a set, still-available
 * response window (etiquette.window). Before this gate the
 * derivation stamped "cooling" on every pending plan within 7
 * days of its start and "limbo" on every pending plan past its
 * start, window or no window - plan state alone wearing the
 * cooling treatment's vocabulary. The stamp is data today (no
 * surface renders it), but the vocabulary is the treatment's, so
 * the gate belongs here, at the derivation, where a future render
 * would inherit it.
 */
export type InvitationTemperature = "warm" | "cooling" | "limbo" | "settled";

export function invitationTemperature(
  plan: OpalPlanContract,
  now: Date,
): InvitationTemperature | null {
  if (settledKindForPlan(plan)) return "settled";
  const viewer = (plan.viewer_state ?? "").toLowerCase();
  if (viewer !== "pending") return null; // not an open invitation to this viewer
  const etiquette = plan.etiquette ?? null;
  if (etiquette?.limbo?.state === "limbo") return "limbo";
  const windowOpen = Boolean(
    etiquette?.window?.set && etiquette.window.available !== false,
  );
  if (!windowOpen) return "warm"; // pending but unwindowed: no cooling, ever
  const start = parsePlanDate(plan.start_at);
  if (!start) return "warm";
  const d = calendarDayDiff(now, start);
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

/**
 * Repair #20 (F-13 + F-20) - the ONE real action surface a spine
 * item opens when tapped, finished here in the projection (the
 * view derives nothing and a surface never guesses). Spine tasks
 * are CONNECTOR EXECUTION POINTS (F-20): where a real connector
 * route exists for the task type, the surface hands off INTO the
 * viewer's own connected tool; where none exists, the item carries
 * no connector claim (see the mapping in the C6 report):
 * - "food-panel": the B2 food composed-handoff panel mounted on the
 *   same plan detail (items compose, per-person handoff,
 *   self-confirm). CONNECTOR ROUTE: the handoff opens the viewer's
 *   OWN delivery app (DoorDash / Uber Eats / GrubHub provider search,
 *   FoodHandoff.provider_choices) or the restaurant's own held site.
 * - "checkin": the check-in circle row mounted on the same detail.
 * - "where": the detail's Where section (the place itself, its join /
 *   handoff actions).
 * - "plan-chat": the plan-scoped Opal chat doorway - the same scoped
 *   session the revision / request-a-change flows enter. Restaurant
 *   results are chosen, the ride ask is answered, and missing slots
 *   are supplied there, conversationally; no other surface for those
 *   tasks exists. Stamped ONLY by foldSpineChatActions, once the
 *   detail's Who rows prove another participant exists to scope the
 *   chat to - a solo plan earns no doorway (honest absence).
 * An item with no action renders as a static row: Opal-owned
 * machinery (calendar projection, follow-through, coming-up) and
 * other people's answers have no user action surface, and a tap
 * that opens nothing real is a defect.
 */
export type SpineAction =
  | { kind: "food-panel" }
  | { kind: "checkin" }
  | { kind: "where" }
  | { kind: "plan-chat" };

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
  /** Repair #20 (F-13) - the item's real action surface, or absent
   *  when none exists (see SpineAction). */
  action?: SpineAction | null;
};

/** Step ids whose action surface lives ON the detail itself. */
const STEP_DETAIL_ACTION: Record<string, SpineAction> = {
  food: { kind: "food-panel" },
  checkin: { kind: "checkin" },
  join_link: { kind: "where" },
  join: { kind: "where" },
};

/** Step ids whose ONLY real action surface is the plan-scoped Opal
 *  chat (results/asks/offers are conversational by backend design -
 *  PlanCompletion records them as next-steps for the turn to speak).
 *  Plus the missing-slot item: a missing day/place is supplied
 *  through the same scoped chat (schedule changes are revisions,
 *  never direct edits). */
const CHAT_ACTION_ITEM_IDS: ReadonlySet<string> = new Set([
  "step-restaurants",
  "step-ride",
  "step-directions",
  "missing-slot",
]);

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
      // F-13: an in-detail action surface is stamped here; the
      // plan-chat surface is folded in later (foldSpineChatActions),
      // once the detail's Who rows exist to scope it.
      action: STEP_DETAIL_ACTION[step.id] ?? null,
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

/**
 * Repair #20 (F-13) - fold the plan-chat action onto the spine items
 * whose only real surface is the plan-scoped Opal chat, once the
 * detail's history leg proves the chat can be scoped: another
 * participant (not the viewer) exists on the plan. Without one there
 * is no person to scope the doorway to, so the items stay static -
 * honest absence, never a dead tap. Items that already carry an
 * in-detail action are untouched.
 */
export function foldSpineChatActions(
  spine: SpineItem[] | undefined,
  opts: { chatAvailable: boolean },
): SpineItem[] | undefined {
  if (!spine || !opts.chatAvailable) return spine;
  return spine.map((item) =>
    CHAT_ACTION_ITEM_IDS.has(item.id) && !item.action
      ? { ...item, action: { kind: "plan-chat" } as SpineAction }
      : item,
  );
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
  const whenLine = planWhenLine(plan);
  items.push({
    id: "event",
    phase: "event",
    // R20 F-14: the spine's event item reads the ONE shared when
    // line, so a multi-day plan shows its range here too.
    label: whenLine !== "Time not set yet." ? `${plan.title} - ${whenLine}` : plan.title,
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
