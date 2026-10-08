/**
 * Reminder / temporal-anchor card projection for Attention Center.
 * Prefer backend enrichment (lifecycle, days_until, plan_status). Until present,
 * project from title/detail/source_type + typed mock seed (see shots/frontend/BLOCKED.md).
 *
 * Phase 6: when reminder_attention flag is "real", never inject mock seed —
 * ReminderCard uses lifecycle fields from real attention items only.
 * Mocks stay for fixture screenshots (forceSeed / mock|auto flag).
 */
import type { AttentionCenterItem } from "../../api/productClient";
import {
  allowsMockFallback,
  requiresRealData,
} from "./intelligenceDataSource";

export type ReminderLifecycle =
  | "upcoming"
  | "day_of"
  | "passed_unplanned"
  | "planned";

export type ReminderPlanStatus = "none" | "planned";

export type ReminderProjection = {
  attentionId: string;
  personId: string | null;
  personName: string;
  anchorType: string;
  anchorDate: string | null;
  daysUntil: number | null;
  lifecycle: ReminderLifecycle;
  planStatus: ReminderPlanStatus;
  planId: string | null;
  planSummary: string | null;
  headline: string;
  detail: string | null;
};

const REMINDER_SOURCE_TYPES = new Set([
  "celebration",
  "temporal",
  "temporal_anchor",
  "reminder",
  "commitment_reminder",
]);

/** Demo / screenshot seed when attention items lack enrichment fields. */
export const REMINDER_MOCK_SEED: ReminderProjection[] = [
  {
    attentionId: "mock-reminder-upcoming",
    personId: "person-maya",
    personName: "Maya",
    anchorType: "birthday",
    anchorDate: "2026-06-14",
    daysUntil: 3,
    lifecycle: "upcoming",
    planStatus: "none",
    planId: null,
    planSummary: null,
    headline: "Maya's birthday is Saturday",
    detail: "3 days away · nothing planned yet",
  },
  {
    attentionId: "mock-reminder-day-of",
    personId: "person-sam",
    personName: "Sam",
    anchorType: "anniversary",
    anchorDate: "2026-10-08",
    daysUntil: 0,
    lifecycle: "day_of",
    planStatus: "none",
    planId: null,
    planSummary: null,
    headline: "Sam's anniversary is today",
    detail: "Still time to plan something",
  },
  {
    attentionId: "mock-reminder-passed",
    personId: "person-alex",
    personName: "Alex",
    anchorType: "birthday",
    anchorDate: "2026-10-01",
    daysUntil: -7,
    lifecycle: "passed_unplanned",
    planStatus: "none",
    planId: null,
    planSummary: null,
    headline: "Alex's birthday was last week",
    detail: "No plan was set — still worth a note",
  },
  {
    attentionId: "mock-reminder-planned",
    personId: "person-jordan",
    personName: "Jordan",
    anchorType: "birthday",
    anchorDate: "2026-10-11",
    daysUntil: 3,
    lifecycle: "planned",
    planStatus: "planned",
    planId: "plan-jordan-dinner",
    planSummary: "Dinner at Juniper · Sat 7:30",
    headline: "Jordan's birthday is Saturday",
    detail: "Dinner at Juniper · Sat 7:30",
  },
];

export function isReminderSourceType(sourceType: string | null | undefined): boolean {
  if (!sourceType) return false;
  return REMINDER_SOURCE_TYPES.has(sourceType);
}

function weekdayLabel(isoDate: string | null, daysUntil: number | null): string {
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  if (!isoDate) {
    if (daysUntil != null && daysUntil > 1) return `in ${daysUntil} days`;
    return "soon";
  }
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "soon";
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "soon";
  }
}

export function buildReminderHeadline(
  personName: string,
  anchorType: string,
  daysUntil: number | null,
  anchorDate: string | null,
): string {
  const kind =
    anchorType === "anniversary"
      ? "anniversary"
      : anchorType === "deadline"
        ? "deadline"
        : "birthday";
  if (daysUntil != null && daysUntil < 0) {
    const ago = Math.abs(daysUntil);
    if (ago === 1) return `${personName}'s ${kind} was yesterday`;
    if (ago <= 7) return `${personName}'s ${kind} was last week`;
    return `${personName}'s ${kind} passed`;
  }
  const when = weekdayLabel(anchorDate, daysUntil);
  if (when === "today") return `${personName}'s ${kind} is today`;
  if (when === "tomorrow") return `${personName}'s ${kind} is tomorrow`;
  return `${personName}'s ${kind} is ${when}`;
}

/** Infer lifecycle when backend enrichment is missing. */
export function inferLifecycle(
  daysUntil: number | null,
  planStatus: ReminderPlanStatus,
): ReminderLifecycle {
  if (planStatus === "planned") return "planned";
  if (daysUntil === 0) return "day_of";
  if (daysUntil != null && daysUntil < 0) return "passed_unplanned";
  return "upcoming";
}

/**
 * Project an attention item into a ReminderProjection when source_type matches.
 * Prefers first-class lifecycle enrichment fields when present.
 * Returns null for non-reminder rows (caller keeps default activity-row).
 */
export function projectReminder(
  item: AttentionCenterItem,
): ReminderProjection | null {
  if (!isReminderSourceType(item.source_type)) return null;

  const personName =
    (typeof item.person_name === "string" && item.person_name.trim()) ||
    guessPersonFromTitle(item.title) ||
    "Someone";
  const anchorType =
    (typeof item.anchor_type === "string" && item.anchor_type) ||
    guessAnchorType(item.title, item.detail) ||
    "birthday";
  const daysUntil =
    typeof item.days_until === "number" ? item.days_until : null;
  const planStatus: ReminderPlanStatus =
    item.plan_status === "planned" || item.plan_id ? "planned" : "none";
  const lifecycleRaw = item.lifecycle;
  const lifecycle: ReminderLifecycle =
    lifecycleRaw === "upcoming" ||
    lifecycleRaw === "day_of" ||
    lifecycleRaw === "passed_unplanned" ||
    lifecycleRaw === "planned"
      ? lifecycleRaw
      : inferLifecycle(daysUntil, planStatus);

  const anchorDate =
    typeof item.anchor_date === "string" ? item.anchor_date : null;
  const headline =
    item.title?.trim() ||
    buildReminderHeadline(personName, anchorType, daysUntil, anchorDate);

  let detail = item.detail || item.copy || null;
  if (!detail && daysUntil != null && planStatus === "none") {
    if (daysUntil > 1) detail = `${daysUntil} days away · nothing planned yet`;
    else if (daysUntil === 1) detail = "Tomorrow · nothing planned yet";
    else if (daysUntil === 0) detail = "Still time to plan something";
  }
  if (planStatus === "planned" && item.plan_summary) {
    detail = String(item.plan_summary);
  }

  return {
    attentionId: item.id,
    personId: typeof item.person_id === "string" ? item.person_id : null,
    personName,
    anchorType,
    anchorDate,
    daysUntil,
    lifecycle,
    planStatus,
    planId: item.plan_id ?? null,
    planSummary:
      typeof item.plan_summary === "string" ? item.plan_summary : null,
    headline,
    detail,
  };
}

function guessPersonFromTitle(title: string | undefined): string | null {
  if (!title) return null;
  const m = title.match(/^([A-Z][a-zA-Z'’\-]+)'s\b/);
  return m ? m[1] : null;
}

function guessAnchorType(
  title: string | undefined,
  detail: string | null | undefined,
): string {
  const blob = `${title || ""} ${detail || ""}`.toLowerCase();
  if (blob.includes("anniversary")) return "anniversary";
  if (blob.includes("deadline")) return "deadline";
  return "birthday";
}

/** Prefill body for Plan something → postOpalMessage. */
export function planSomethingPrefill(reminder: ReminderProjection): string {
  const dateBit = reminder.anchorDate
    ? ` on ${reminder.anchorDate}`
    : reminder.daysUntil === 0
      ? " today"
      : "";
  return `Plan something for ${reminder.personName}'s ${reminder.anchorType}${dateBit}`;
}

/**
 * Merge live attention reminder rows with mock seed for demos/tests.
 * Backend order wins for real items — never client re-sort by priority.
 * Mock seeds append only when no real reminder rows exist (or forceSeed),
 * and never when reminder_attention flag is "real".
 */
export function mergeReminderFeed(
  items: AttentionCenterItem[],
  opts?: { forceSeed?: boolean; includeMockWhenEmpty?: boolean },
): Array<{ item: AttentionCenterItem | null; reminder: ReminderProjection }> {
  const projected: Array<{
    item: AttentionCenterItem | null;
    reminder: ReminderProjection;
  }> = [];

  for (const item of items) {
    const reminder = projectReminder(item);
    if (reminder) projected.push({ item, reminder });
  }

  const allowSeed =
    opts?.forceSeed === true ||
    (!requiresRealData("reminder_attention") &&
      allowsMockFallback("reminder_attention") &&
      opts?.includeMockWhenEmpty !== false);

  if (allowSeed && projected.length === 0) {
    for (const seed of REMINDER_MOCK_SEED) {
      projected.push({ item: null, reminder: seed });
    }
  }

  return projected;
}
