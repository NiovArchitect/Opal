/**
 * Paste W Amendment L2 — plan state color code (character palette).
 * Confirmed = electric teal/blue. Pending = bright amber/gold. Idea = violet.
 * Separate from Signal Grammar gold-for-earned-truth; plan UI uses this map.
 */

export const PLAN_STATE_HEX = {
  confirmed: "#00E5FF", // locked / confirmed / happening — electric teal
  pending: "#FFC86B", // waiting on someone — bright amber (never brown/olive)
  idea: "#8B5CF6", // idea / forming / unconfirmed — violet
} as const;

export type PlanDisplayState =
  | "idea"
  | "forming"
  | "pending"
  | "locked"
  | "happening"
  | "past";

/** Legal plan lifecycle (Amendment L6). */
export const PLAN_LIFECYCLE: readonly PlanDisplayState[] = [
  "idea",
  "forming",
  "pending",
  "locked",
  "happening",
  "past",
] as const;

export function planStateColor(state: string | null | undefined): string {
  const s = (state || "").toLowerCase();
  if (s === "locked" || s === "confirmed" || s === "happening" || s === "ready") {
    return PLAN_STATE_HEX.confirmed;
  }
  if (s === "pending" || s === "waiting" || s === "waiting_on") {
    return PLAN_STATE_HEX.pending;
  }
  if (
    s === "idea" ||
    s === "forming" ||
    s === "unconfirmed" ||
    s === "provisional" ||
    s === "proposed"
  ) {
    return PLAN_STATE_HEX.idea;
  }
  if (s === "past" || s === "settled" || s === "ended") {
    return "#94A1B8";
  }
  return PLAN_STATE_HEX.idea;
}

export function planStateAttr(state: string | null | undefined): PlanDisplayState {
  const s = (state || "").toLowerCase();
  if (s === "locked" || s === "confirmed") return "locked";
  if (s === "happening" || s === "live") return "happening";
  if (s === "pending" || s === "waiting" || s === "waiting_on") return "pending";
  if (s === "past" || s === "settled" || s === "ended") return "past";
  if (s === "idea") return "idea";
  if (s === "forming" || s === "unconfirmed" || s === "provisional" || s === "proposed") {
    return "forming";
  }
  return "forming";
}

/** Plain-language label for the color code. */
export function planStateLabel(state: PlanDisplayState): string {
  switch (state) {
    case "idea":
      return "Idea";
    case "forming":
      return "Forming";
    case "pending":
      return "Waiting";
    case "locked":
      return "Locked";
    case "happening":
      return "Happening";
    case "past":
      return "Past";
  }
}
