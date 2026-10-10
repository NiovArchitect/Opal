/**
 * Paste W6 — canonical plan-state color law (pill FILL carries state).
 * happening/confirmed = cyan · action = red · ready/upcoming = amber ·
 * past = white · forming/idea = purple. Never font-alone state.
 */

export const PLAN_STATE_HEX = {
  /** happening / now / live / confirmed / locked */
  happening: "#00E5FF",
  /** action needed / pending / waiting */
  action: "#FF4D5E",
  /** ready / upcoming */
  ready: "#FFC86B",
  /** past / settled / ended */
  past: "#FFFFFF",
  /** forming / idea / unconfirmed */
  forming: "#8B5CF6",
} as const;

/** Pill label ink — paired with PLAN_STATE_HEX fills. */
export const PLAN_STATE_PILL_TEXT = {
  happening: "#FFFFFF",
  action: "#FFFFFF",
  ready: "#0A0F1E",
  past: "#0A0F1E",
  forming: "#FFFFFF",
} as const;

/** @deprecated W5 aliases — prefer happening / action / forming keys. */
export const PLAN_STATE_HEX_ALIASES = {
  confirmed: PLAN_STATE_HEX.happening,
  pending: PLAN_STATE_HEX.action,
  idea: PLAN_STATE_HEX.forming,
} as const;

export type PlanDisplayState =
  | "idea"
  | "forming"
  | "action"
  | "ready"
  | "locked"
  | "happening"
  | "past";

/** Legal plan lifecycle (Amendment L6 + W6 ready/action). */
export const PLAN_LIFECYCLE: readonly PlanDisplayState[] = [
  "idea",
  "forming",
  "action",
  "ready",
  "locked",
  "happening",
  "past",
] as const;

export type PlanStateFamily = keyof typeof PLAN_STATE_HEX;

export function planStateFamily(state: string | null | undefined): PlanStateFamily {
  const s = (state || "").toLowerCase();
  if (
    s === "locked" ||
    s === "confirmed" ||
    s === "happening" ||
    s === "now" ||
    s === "live"
  ) {
    return "happening";
  }
  if (
    s === "action" ||
    s === "pending" ||
    s === "waiting" ||
    s === "waiting_on" ||
    s === "needs_attention"
  ) {
    return "action";
  }
  if (s === "ready" || s === "upcoming" || s === "aligned") {
    return "ready";
  }
  if (s === "past" || s === "settled" || s === "ended") {
    return "past";
  }
  return "forming";
}

export function planStateColor(state: string | null | undefined): string {
  return PLAN_STATE_HEX[planStateFamily(state)];
}

export function planStatePillText(state: string | null | undefined): string {
  return PLAN_STATE_PILL_TEXT[planStateFamily(state)];
}

export function planStateAttr(state: string | null | undefined): PlanDisplayState {
  const s = (state || "").toLowerCase();
  if (s === "locked" || s === "confirmed") return "locked";
  if (s === "happening" || s === "live" || s === "now") return "happening";
  if (s === "ready" || s === "upcoming" || s === "aligned") return "ready";
  if (
    s === "action" ||
    s === "pending" ||
    s === "waiting" ||
    s === "waiting_on" ||
    s === "needs_attention"
  ) {
    return "action";
  }
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
    case "action":
      return "Action needed";
    case "ready":
      return "Ready";
    case "locked":
      return "Locked";
    case "happening":
      return "Happening";
    case "past":
      return "Past";
  }
}
