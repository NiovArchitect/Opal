/**
 * Repair #18 Division C1 - the ONE plan projection (spec section 2.1).
 *
 * Every plan surface in C1 consumes this object and nothing else.
 * Surfaces render it; they never re-derive state, never format a time
 * from a label, never count participants. A payload missing id, title,
 * state or when is invalid: the surface renders the honest fallback
 * ("Plan details are not ready yet.") and never a partial guessed card.
 *
 * State hues/labels/glyphs: C2 section 2.4 table (wins for color per
 * the C2 3.5 conflict rule), rendered through the --state-* tokens.
 * There is deliberately NO "pending" state (C1 1.4: pending is not a
 * state; awaiting the viewer is action, awaiting someone else is
 * forming). Unknown state values render the forming treatment with
 * the pill label "Needs a look" and are logged (C2 2.4 unknown rule).
 */
import { attendanceLineFromContract, conflictLineFromContract } from "../planCardContract";

export type PlanState = "forming" | "action" | "ready" | "happening" | "past";

export type PlanWhen =
  | { kind: "canonical"; label: string }
  | { kind: "labelOnly"; label: string }
  | { kind: "unset" };

export type PlanWhere =
  | { kind: "place"; name: string; area?: string | null }
  | { kind: "virtual"; label: string }
  | { kind: "unset" };

export type PlanFace = { name: string; avatarUrl?: string | null; initials: string };

export type PlanAttendance = {
  going: number;
  interested: number;
  total: number;
  viewerState: "going" | "interested" | "invited" | "notGoing" | null;
  faces: PlanFace[];
} | null;

export type PlanProjection = {
  id: string;
  title: string;
  state: PlanState;
  stateLabel: string;
  primaryAction: {
    kind: "confirm" | "respond" | "pickTime" | "pickPlace" | "view" | "none";
    label: string;
  };
  when: PlanWhen;
  where: PlanWhere;
  attendance: PlanAttendance;
  conflict?: { title: string; timeLabel?: string | null } | null;
  proposal?: { proposerName: string; newLabel: string; currentLabel: string } | null;
  participants?: { name: string; face: PlanFace; response: string }[] | null;
  updatedAt?: string | null;
};

export const PLAN_STATES: PlanState[] = ["forming", "action", "ready", "happening", "past"];

/** Pill label + glyph per state. Label is ALWAYS shown (never color alone). */
export const STATE_META: Record<PlanState, { label: string; glyph: string }> = {
  forming: { label: "Forming", glyph: "○" },
  action: { label: "Action needed", glyph: "◆" },
  ready: { label: "Ready", glyph: "✓" },
  happening: { label: "Happening", glyph: "●" },
  past: { label: "Past", glyph: "◷" },
};

export function isPlanState(value: unknown): value is PlanState {
  return typeof value === "string" && (PLAN_STATES as string[]).includes(value);
}

/** Validate a raw payload into a PlanProjection, or null (= invalid). */
export function validatePlanProjection(raw: unknown): PlanProjection | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<PlanProjection>;
  if (!p.id || typeof p.id !== "string") return null;
  if (!p.title || typeof p.title !== "string" || !p.title.trim()) return null;
  if (!p.when || typeof p.when !== "object") return null;
  if (!isPlanState(p.state)) {
    // Unknown state: forming-safe fallback with a visible honest label (C2 2.4).
    if (typeof p.state === "string" && p.state) {
      console.warn("[c1] unknown plan state value", p.state);
      return {
        ...(p as PlanProjection),
        state: "forming",
        stateLabel: "Needs a look",
        primaryAction: p.primaryAction ?? { kind: "view", label: "View plan" },
        attendance: p.attendance ?? null,
      };
    }
    return null;
  }
  return {
    ...(p as PlanProjection),
    stateLabel: p.stateLabel || STATE_META[p.state].label,
    primaryAction: p.primaryAction ?? { kind: "view", label: "View plan" },
    attendance: p.attendance ?? null,
  };
}

/** When line, built ONLY from the projection's own display string. */
export function whenLine(plan: PlanProjection): string {
  switch (plan.when.kind) {
    case "canonical":
      return plan.when.label;
    case "labelOnly":
      return `Time not set yet. ${plan.when.label} was mentioned.`;
    case "unset":
      return "Time not set yet.";
  }
}

/** Where line; null on compact cards when unset (spec 2.3). */
export function whereLine(plan: PlanProjection, detail = false): string | null {
  switch (plan.where.kind) {
    case "place":
      return plan.where.area ? `${plan.where.name}, ${plan.where.area}` : plan.where.name;
    case "virtual":
      return plan.where.label;
    case "unset":
      return detail ? "Place not set yet." : null;
  }
}

/** Attendance text from the projection fields only. Null attendance -> null. */
export function attendanceLine(plan: PlanProjection): string | null {
  if (!plan.attendance) return null;
  return attendanceLineFromContract({
    going_count: plan.attendance.going,
    interested_count: plan.attendance.interested,
    total_count: plan.attendance.total,
  });
}

/** Personal viewer line, only when true (spec 4.2). */
export function viewerLine(plan: PlanProjection): string | null {
  if (!plan.attendance) return null;
  if (plan.attendance.viewerState === "going") return "You are in.";
  if (plan.attendance.viewerState === "interested") return "You are interested.";
  if (plan.state === "action") return "Needs your answer.";
  return null;
}

export function conflictLine(plan: PlanProjection): string | null {
  if (!plan.conflict) return null;
  return conflictLineFromContract({
    conflict: {
      title: plan.conflict.title,
      time_label: plan.conflict.timeLabel ?? null,
    },
  });
}
