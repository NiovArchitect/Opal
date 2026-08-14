/**
 * Client projection of AttentionAuthority (Pass 10).
 *
 * Home is a living field of what matters now — not a signal feed.
 * Silence is first-class: many internal events → few human surfaces.
 *
 * Does not invent SocialReality; filters ProductSignal projections for presentation.
 */

import type { ProductSignal } from "../api/productClient";
import { isUsableReality, presenceLines } from "../sharedReality";

export type AttentionClass =
  | "silence"
  | "ambient"
  | "useful_now"
  | "action_required"
  | "time_sensitive"
  | "critical";

export type AttentionBand = "now" | "later" | "quiet";

export type AttentionDecision = {
  class: AttentionClass;
  shouldSurfaceHome: boolean;
  shouldSurfaceChatFilament: boolean;
  shouldInterrupt: boolean;
  priority: number;
  reason: string;
  band: AttentionBand;
};

export type HomeFieldItem = {
  signal: ProductSignal;
  decision: AttentionDecision;
  band: AttentionBand;
};

function stageOf(s: ProductSignal): string {
  return (s.lifecycle_stage || "").toLowerCase();
}

function nextGapOf(s: ProductSignal): string {
  const sr = s.shared_reality as
    | { next_gap?: string; gaps?: string[] }
    | undefined;
  const g =
    (s as { next_gap?: string }).next_gap ||
    sr?.next_gap ||
    (Array.isArray(sr?.gaps) ? sr!.gaps!.find((x) => x && x !== "none") : "") ||
    "";
  return String(g).toLowerCase();
}

function hasDims(s: ProductSignal): boolean {
  const sr = s.shared_reality;
  return !!(sr?.what || sr?.when || sr?.where || sr?.headline);
}

/** Pure evaluate — mirrors domain AttentionAuthority.evaluate for Home/Chat. */
export function evaluateAttention(signal: ProductSignal): AttentionDecision {
  if (signal.kind === "proposal") {
    return dec("silence", false, false, false, 0, "proposal_satellite");
  }

  const stage = stageOf(signal);
  const gap = nextGapOf(signal);
  const actionableGap = ["time", "place", "activity", "participants", "open_loop"].includes(gap);
  const usable = isUsableReality(signal);
  const suf = String(signal.shared_reality?.sufficiency || "").toLowerCase();

  if (stage === "handled" || stage === "canceled") {
    return dec("ambient", false, false, false, 5, "handled_recede", "quiet");
  }

  // Quiet / empty intention — silence (not Home ambient)
  if (stage === "quiet" || (suf === "intention" && !hasDims(signal))) {
    return dec("silence", false, false, false, 0, "weak_intention");
  }

  if (actionableGap && signal.requires_user_action !== false) {
    return dec("action_required", true, true, false, 40, "next_gap_action", "now");
  }

  if (usable && (suf === "usable" || stage === "set" || stage === "ready")) {
    return dec("useful_now", true, false, false, 30, "usable_ambient", "now");
  }

  if (suf === "converging" || stage === "still_open" || stage === "plan_forming") {
    return dec("ambient", true, false, false, 15, "converging_field", "later");
  }

  if (hasDims(signal)) {
    return dec("ambient", true, false, false, 12, "dims_ambient", "later");
  }

  return dec("silence", false, false, false, 0, "no_attention_justified");
}

function dec(
  cls: AttentionClass,
  home: boolean,
  filament: boolean,
  interrupt: boolean,
  priority: number,
  reason: string,
  band: AttentionBand = "quiet",
): AttentionDecision {
  return {
    class: cls,
    shouldSurfaceHome: home,
    shouldSurfaceChatFilament: filament,
    shouldInterrupt: interrupt,
    priority,
    reason,
    band:
      cls === "action_required" || cls === "time_sensitive" || cls === "critical" || cls === "useful_now"
        ? band === "quiet"
          ? "now"
          : band
        : cls === "ambient"
          ? "later"
          : band,
  };
}

/**
 * Compress Home presence: sparse NOW / LATER / QUIET field.
 * Caps prevent endless feed feel under multi-seed history.
 */
export function composeHomeAttentionField(
  signals: ProductSignal[],
  opts?: { maxNow?: number; maxLater?: number; maxQuiet?: number },
): HomeFieldItem[] {
  const maxNow = opts?.maxNow ?? 2;
  const maxLater = opts?.maxLater ?? 3;
  const maxQuiet = opts?.maxQuiet ?? 1;

  const evaluated = signals
    .map((signal) => {
      const decision = evaluateAttention(signal);
      return { signal, decision, band: decision.band };
    })
    .filter((x) => x.decision.shouldSurfaceHome)
    .sort((a, b) => b.decision.priority - a.decision.priority);

  const now = evaluated.filter((x) => x.band === "now").slice(0, maxNow);
  const later = evaluated.filter((x) => x.band === "later").slice(0, maxLater);
  const quiet = evaluated.filter((x) => x.band === "quiet").slice(0, maxQuiet);

  // Prefer action items first, then later ambient, then quiet recall
  return [...now, ...later, ...quiet];
}

/** Chat filament: hide historical status noise; keep causal / current action. */
export function shouldShowFilamentLabel(label: string | undefined | null): boolean {
  if (!label) return false;
  const t = label.trim();
  // Historical status / recompute noise
  if (/replaced\s+\w+/i.test(t) && /became|replaced/i.test(t)) {
    // "Thursday · 6:30 replaced Thursday" style
    if (/replaced\s+(thursday|friday|saturday|sunday|monday|tuesday|wednesday)/i.test(t)) {
      return false;
    }
  }
  if (/recomputed|sync(ed)? successfully|signal updated/i.test(t)) return false;
  return true;
}

/** Human-facing continuation copy from daypart (client mirror). */
export function continuationLabel(opts: {
  hour?: number;
  remote?: boolean;
  weekend?: boolean;
  solo?: boolean;
}): string {
  const hour = opts.hour ?? new Date().getHours();
  if (opts.remote) return "Keep hanging out";
  if (hour >= 5 && hour < 12) return opts.weekend ? "Keep the day going" : "Keep the morning going";
  if (hour >= 12 && hour < 17) return opts.solo ? "Keep the day going" : "Go somewhere next";
  if (hour >= 17 && hour < 21) return "Keep the evening going";
  return "Extend the night";
}

/** Diagnostic: count attention residue on a list of signals. */
export function attentionResidue(signals: ProductSignal[]): {
  total: number;
  surfaced: number;
  silenced: number;
  actionRequired: number;
} {
  let surfaced = 0;
  let silenced = 0;
  let actionRequired = 0;
  for (const s of signals) {
    const d = evaluateAttention(s);
    if (d.shouldSurfaceHome) surfaced++;
    else silenced++;
    if (d.class === "action_required" || d.class === "time_sensitive") actionRequired++;
  }
  return { total: signals.length, surfaced, silenced, actionRequired };
}

// touch presenceLines import for tree-shaking friendliness in tests
export function presenceTitleFor(signal: ProductSignal): string {
  return presenceLines(signal).title;
}
