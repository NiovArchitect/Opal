/**
 * P3 Signal Grammar — CURRENT behavioral mapping owner (Figma 965:2).
 * State names choose visual treatment. Hex must never become domain truth.
 *
 * Confidence ≠ confirmation. Gold must be earned. Zero signal is valid.
 * Never dim the human. COLOR + PLAIN LANGUAGE (+ icon).
 *
 * Brand / category / identity / media hex reuse is NOT behavioral signal.
 * See docs/authority/OPAL_COLOR_TAXONOMY.md
 */

export const SIGNAL_HEX = {
  active: "#00E5FF", // CYAN — DO NOW
  changed: "#00F0D1", // AQUA — meaningful context / alignment changed
  confirmed: "#FFC86B", // GOLD — earned ready / reserved / confirmed / shared truth
  needs_attention: "#FF6B9D", // CORAL — needs you (scarce)
  provisional: "#8B5CF6", // VIOLET — possibility / review / unconfirmed
  settled: "#94A1B8", // NEUTRAL — history / nothing required
} as const;

export type SignalSemanticState =
  | "active"
  | "changed"
  | "confirmed"
  | "needs_attention"
  | "provisional"
  | "settled"
  | "live";

export type SignalPresentation = {
  state: SignalSemanticState;
  hex: string;
  plainLanguage: string;
  icon?: string;
  interruptionLevel: 0 | 1 | 2 | 3 | 4;
};

/** Calls Continuity kinds → Signal Grammar (P2 frozen reference mapping). */
export function signalForCallsKind(
  kind: "ready" | "callback" | "graph_updated" | "needs_you" | undefined,
  label?: string,
): SignalPresentation | null {
  if (!kind) return null; // ZERO SIGNAL is valid
  switch (kind) {
    case "ready":
      return {
        state: "confirmed",
        hex: SIGNAL_HEX.confirmed,
        plainLanguage: label || "Ready",
        icon: "✦",
        interruptionLevel: 1,
      };
    case "graph_updated":
      return {
        state: "changed",
        hex: SIGNAL_HEX.changed,
        plainLanguage: label || "Graph updated",
        icon: "✦",
        interruptionLevel: 1,
      };
    case "callback":
    case "needs_you":
      return {
        state: "needs_attention",
        hex: SIGNAL_HEX.needs_attention,
        plainLanguage: label || (kind === "callback" ? "Call back" : "Needs your answer"),
        icon: "✦",
        interruptionLevel: 2,
      };
    default:
      return null;
  }
}

/**
 * Product filament / legacy signal kinds.
 * "ready" / confirmed truth → GOLD. "set" (completion emerald) stays outside Signal Grammar gold.
 * Inference / overlap / forming → provisional or recognition — never gold.
 */
export function signalForProductKind(kind: string | undefined | null): SignalPresentation | null {
  if (!kind) return null;
  switch (kind) {
    case "ready":
      return {
        state: "confirmed",
        hex: SIGNAL_HEX.confirmed,
        plainLanguage: "Ready",
        interruptionLevel: 1,
      };
    case "plan_forming":
    case "availability_overlap":
    case "option_surfaced":
      return {
        state: "provisional",
        hex: SIGNAL_HEX.provisional,
        plainLanguage: "Forming",
        interruptionLevel: 1,
      };
    case "open_loop":
      return {
        state: "needs_attention",
        hex: SIGNAL_HEX.needs_attention,
        plainLanguage: "Open loop",
        interruptionLevel: 2,
      };
    case "set":
      // Completion / Set is NOT Gold confirmation — leave to Brand completion chrome
      return {
        state: "settled",
        hex: SIGNAL_HEX.settled,
        plainLanguage: "Set",
        interruptionLevel: 0,
      };
    default:
      return null;
  }
}

/** Gold is forbidden for AI confidence / rank / recommendation alone. */
export function goldAllowedFor(reason: {
  providerConfirmed?: boolean;
  reservationExists?: boolean;
  participantConfirmed?: boolean;
  sharedTruthResolved?: boolean;
  soloCommitted?: boolean;
}): boolean {
  return !!(
    reason.providerConfirmed ||
    reason.reservationExists ||
    reason.participantConfirmed ||
    reason.sharedTruthResolved ||
    reason.soloCommitted
  );
}

export const SIGNAL_CSS_VARS = {
  active: "--signal-active",
  changed: "--signal-changed",
  confirmed: "--signal-confirmed",
  needs_attention: "--signal-needs-attention",
  provisional: "--signal-provisional",
  settled: "--signal-settled",
} as const;
