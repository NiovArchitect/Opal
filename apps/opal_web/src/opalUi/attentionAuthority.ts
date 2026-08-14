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
 *
 * Ranking before caps (Pass 11):
 * 1) evaluate  2) collapse same conversation  3) sort by priority  4) band caps as rails
 */
export function composeHomeAttentionField(
  signals: ProductSignal[],
  opts?: { maxNow?: number; maxLater?: number; maxQuiet?: number },
): HomeFieldItem[] {
  return composeHomeAttentionFieldExplain(signals, opts).surfaced;
}

export type HomeFieldExplain = {
  candidates: HomeFieldItem[];
  afterCollapse: HomeFieldItem[];
  surfaced: HomeFieldItem[];
  suppressed: Array<HomeFieldItem & { suppressReason: string }>;
};

export function composeHomeAttentionFieldExplain(
  signals: ProductSignal[],
  opts?: { maxNow?: number; maxLater?: number; maxQuiet?: number },
): HomeFieldExplain {
  const maxNow = opts?.maxNow ?? 2;
  const maxLater = opts?.maxLater ?? 3;
  const maxQuiet = opts?.maxQuiet ?? 1;

  const candidates = signals.map((signal) => {
    const decision = evaluateAttention(signal);
    // Temporal urgency if product signal carries leave/when metadata later
    const minutes = (signal as { minutes_until?: number }).minutes_until;
    let priority = decision.priority;
    if (typeof minutes === "number") {
      if (minutes >= 0 && minutes <= 60) priority += 50;
      else if (minutes <= 360) priority += 30;
      else if (minutes <= 24 * 60) priority += 15;
    }
    return {
      signal,
      decision: { ...decision, priority },
      band: decision.band,
    };
  });

  const suppressed: Array<HomeFieldItem & { suppressReason: string }> = [];
  const eligible: HomeFieldItem[] = [];
  for (const c of candidates) {
    if (!c.decision.shouldSurfaceHome) {
      suppressed.push({ ...c, suppressReason: `attention_silence:${c.decision.reason}` });
    } else {
      eligible.push(c);
    }
  }

  // Reality collapse: one per conversation_id
  const byLin = new Map<string, HomeFieldItem>();
  for (const c of eligible) {
    const lin = c.signal.conversation_id || "_";
    const prev = byLin.get(lin);
    if (!prev || c.decision.priority > prev.decision.priority) {
      if (prev) {
        suppressed.push({
          ...prev,
          suppressReason: "reality_collapse:lost_to_higher_priority_same_lineage",
        });
      }
      byLin.set(lin, c);
    } else {
      suppressed.push({
        ...c,
        suppressReason: "reality_collapse:lost_to_higher_priority_same_lineage",
      });
    }
  }

  const afterCollapse = [...byLin.values()].sort(
    (a, b) => b.decision.priority - a.decision.priority,
  );

  const takeBand = (band: AttentionBand, max: number) => {
    const rows = afterCollapse.filter((x) => x.band === band);
    const kept = rows.slice(0, max);
    for (const drop of rows.slice(max)) {
      suppressed.push({
        ...drop,
        suppressReason: `cap_after_rank:${band}:priority_${drop.decision.priority}`,
      });
    }
    return kept;
  };

  const surfaced = [
    ...takeBand("now", maxNow),
    ...takeBand("later", maxLater),
    ...takeBand("quiet", maxQuiet),
  ];

  return { candidates, afterCollapse, surfaced, suppressed };
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
