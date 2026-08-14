/**
 * Client projection of AttentionAuthority (Pass 10–13).
 *
 * Home is a living field of what matters now — not a signal feed.
 * Silence is first-class: many internal events → few human surfaces.
 *
 * Pass 13: rank by consequence urgency (temporal proximity + actionability +
 * cost of delay + external deadlines) — not identity, not insertion order.
 * Do not invent SocialReality; filter ProductSignal projections for presentation.
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
  reasons?: string[];
};

export type AttentionScoreExplain = {
  signal: ProductSignal;
  decision: AttentionDecision;
  priority: number;
  reasons: string[];
  minutesUntil: number | null;
  actionDeadlineMinutes: number | null;
  gap: string;
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

function whenLabelOf(s: ProductSignal): string {
  const sr = s.shared_reality;
  const gc = s.group_composition as
    | { when?: { strongest_common_start?: string; day?: string }; human_surface?: { when_line?: string } }
    | undefined;
  return [
    sr?.when,
    gc?.human_surface?.when_line,
    gc?.when?.strongest_common_start,
    gc?.when?.day,
  ]
    .filter(Boolean)
    .join(" · ");
}

function actionableGap(gap: string): boolean {
  return [
    "time",
    "place",
    "activity",
    "participants",
    "open_loop",
    "confirm_required_person",
    "where",
  ].includes(gap);
}

/**
 * Infer minutes until the relevant event/action horizon from signal facts.
 * Uses explicit minutes_until when present; otherwise parses human when labels.
 * Returns null when temporal proximity cannot be inferred.
 */
export function inferMinutesUntil(signal: ProductSignal, now: Date = new Date()): number | null {
  const ext = signal as {
    minutes_until?: number;
    minutesUntil?: number;
  };
  if (typeof ext.minutes_until === "number" && Number.isFinite(ext.minutes_until)) {
    return ext.minutes_until;
  }
  if (typeof ext.minutesUntil === "number" && Number.isFinite(ext.minutesUntil)) {
    return ext.minutesUntil;
  }

  const leaveRaw =
    signal.shared_reality?.leave_by ||
    signal.shared_reality?.leave_around ||
    null;
  if (leaveRaw) {
    const leaveMins = parseWhenToMinutes(String(leaveRaw), now);
    if (leaveMins != null) return leaveMins;
  }

  const when = whenLabelOf(signal);
  if (!when) return null;
  return parseWhenToMinutes(when, now);
}

/**
 * External action deadline (reservation hold, booking window) in minutes.
 * Explicit fields only — do not invent deadlines from event start.
 */
export function inferActionDeadlineMinutes(
  signal: ProductSignal,
  now: Date = new Date(),
): number | null {
  const ext = signal as {
    action_deadline_minutes?: number;
    external_deadline_minutes?: number;
    action_deadline_at?: string;
  };
  if (typeof ext.action_deadline_minutes === "number") return ext.action_deadline_minutes;
  if (typeof ext.external_deadline_minutes === "number") return ext.external_deadline_minutes;
  if (ext.action_deadline_at) {
    const d = new Date(ext.action_deadline_at);
    if (!Number.isNaN(d.getTime())) {
      return Math.round((d.getTime() - now.getTime()) / 60000);
    }
  }
  return null;
}

/** Parse human temporal labels → minutes from now. Conservative defaults. */
export function parseWhenToMinutes(raw: string, now: Date = new Date()): number | null {
  const t = raw.trim();
  if (!t) return null;

  // ISO / Date-parseable
  if (/^\d{4}-\d{2}-\d{2}/.test(t) || (t.includes("T") && /\d{4}/.test(t))) {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) {
      return Math.round((d.getTime() - now.getTime()) / 60000);
    }
  }

  const lower = t.toLowerCase();
  const clock = extractClockMinutes(t); // minutes from midnight, or null
  const hour = now.getHours();
  const minute = now.getMinutes();
  const nowMinsOfDay = hour * 60 + minute;

  const atToday = (minsOfDay: number) => {
    let delta = minsOfDay - nowMinsOfDay;
    // If clock already passed by >2h, assume next occurrence only for weekday paths
    return delta;
  };

  if (/\btonight\b/.test(lower) || /\btoday\b/.test(lower)) {
    const target = clock != null ? clock : 19 * 60; // default 7 PM
    let delta = atToday(target);
    // Late night "tonight" after target → still near (0–90m residual)
    if (delta < -120) delta = 30;
    else if (delta < 0) delta = 15;
    return delta;
  }

  if (/\btomorrow\b/.test(lower)) {
    const target = clock != null ? clock : 19 * 60;
    return 24 * 60 - nowMinsOfDay + target;
  }

  // Weekday: Mon…Sun (next occurrence, today if still ahead)
  const wd = lower.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/,
  );
  if (wd) {
    const map: Record<string, number> = {
      sunday: 0,
      sun: 0,
      monday: 1,
      mon: 1,
      tuesday: 2,
      tue: 2,
      wednesday: 3,
      wed: 3,
      thursday: 4,
      thu: 4,
      friday: 5,
      fri: 5,
      saturday: 6,
      sat: 6,
    };
    const want = map[wd[1]];
    if (want != null) {
      const cur = now.getDay();
      let dayDelta = (want - cur + 7) % 7;
      const target = clock != null ? clock : 19 * 60;
      if (dayDelta === 0) {
        let delta = target - nowMinsOfDay;
        if (delta < -60) dayDelta = 7; // already passed → next week
        else return Math.max(delta, 0);
      }
      return dayDelta * 24 * 60 - nowMinsOfDay + target;
    }
  }

  // Bare clock "7:30 PM" → assume today if upcoming else tomorrow
  if (clock != null && !/\b(mon|tue|wed|thu|fri|sat|sun|tonight|today|tomorrow)/i.test(lower)) {
    let delta = clock - nowMinsOfDay;
    if (delta < -30) delta += 24 * 60;
    return delta;
  }

  return null;
}

function extractClockMinutes(raw: string): number | null {
  // 7:30 PM
  let m = raw.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const ap = m[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return h * 60 + mins;
  }
  // 7 PM
  m = raw.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const ap = m[2].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return h * 60;
  }
  // 19:30 24h
  m = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    // Ambiguous bare 1–11: only promote to PM when evening-social context is clear
    // (dinner/tonight/evening words, or hour 5–11 which is conventional evening)
    if (h >= 1 && h <= 11) {
      const socialEvening =
        /\b(dinner|supper|tonight|evening|restaurant|drinks)\b/i.test(raw) || h >= 5;
      if (socialEvening) h += 12;
      // else leave as AM — lower certainty; ranking may still use delay cost via when labels
    }
    return h * 60 + mins;
  }
  return null;
}

/**
 * Cost of delaying an unresolved decision (internal score, never shown).
 * High when waiting loses options or creates coordination work soon.
 */
export function costOfDelayBonus(
  signal: ProductSignal,
  gap: string,
  minutesUntil: number | null,
  actionDeadline: number | null,
): { bonus: number; reasons: string[] } {
  const reasons: string[] = [];
  let bonus = 0;
  const actionable = actionableGap(gap) && signal.requires_user_action !== false;

  if (actionDeadline != null && actionDeadline >= 0) {
    if (actionDeadline <= 15) {
      bonus += 70;
      reasons.push("external_deadline_imminent");
    } else if (actionDeadline <= 60) {
      bonus += 45;
      reasons.push("external_deadline_soon");
    } else if (actionDeadline <= 360) {
      bonus += 20;
      reasons.push("external_deadline_hours");
    }
  }

  if (!actionable) return { bonus, reasons };

  // Unresolved place/time before an imminent event → delaying hurts options
  if (gap === "place" || gap === "time" || gap === "activity") {
    if (minutesUntil != null) {
      if (minutesUntil <= 6 * 60) {
        bonus += 35;
        reasons.push("delay_cost_high_event_within_6h");
      } else if (minutesUntil <= 24 * 60) {
        bonus += 28;
        reasons.push("delay_cost_high_event_tonight_or_today");
      } else if (minutesUntil <= 48 * 60) {
        bonus += 12;
        reasons.push("delay_cost_moderate_within_2d");
      } else {
        bonus += 5;
        reasons.push("delay_cost_low_later");
      }
    } else {
      const when = whenLabelOf(signal).toLowerCase();
      if (/\btonight\b|\btoday\b/.test(when)) {
        bonus += 28;
        reasons.push("delay_cost_high_when_tonight_today");
      } else if (/\btomorrow\b/.test(when)) {
        bonus += 14;
        reasons.push("delay_cost_moderate_tomorrow");
      } else if (/\b(sat|sun|mon|tue|wed|thu|fri|saturday|sunday)/.test(when)) {
        bonus += 6;
        reasons.push("delay_cost_low_weekday_later");
      } else {
        bonus += 8;
        reasons.push("delay_cost_unknown_when_actionable");
      }
    }
  }

  return { bonus, reasons };
}

function temporalProximityBonus(minutesUntil: number | null, leaveRelevant: boolean): {
  bonus: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (leaveRelevant) {
    reasons.push("leave_window_relevant");
    return { bonus: 45, reasons };
  }
  if (minutesUntil == null) return { bonus: 0, reasons };
  if (minutesUntil >= 0 && minutesUntil <= 60) {
    reasons.push("temporal_within_1h");
    return { bonus: 50, reasons };
  }
  if (minutesUntil <= 360) {
    reasons.push("temporal_within_6h");
    return { bonus: 30, reasons };
  }
  if (minutesUntil <= 24 * 60) {
    reasons.push("temporal_within_24h");
    return { bonus: 18, reasons };
  }
  if (minutesUntil <= 3 * 24 * 60) {
    reasons.push("temporal_within_3d");
    return { bonus: 6, reasons };
  }
  reasons.push("temporal_far");
  return { bonus: 2, reasons };
}

/** Pure evaluate — mirrors domain AttentionAuthority.evaluate for Home/Chat. */
export function evaluateAttention(signal: ProductSignal, now: Date = new Date()): AttentionDecision {
  if (signal.kind === "proposal") {
    return dec("silence", false, false, false, 0, "proposal_satellite");
  }

  const extFlags = signal as {
    recompute_only?: boolean;
    private_memory_only?: boolean;
    duplicate_of_active?: boolean;
  };
  if (extFlags.recompute_only) {
    return dec("silence", false, false, false, 0, "recompute_no_delta");
  }
  if (extFlags.private_memory_only) {
    return dec("silence", false, false, false, 0, "private_memory_no_home");
  }
  if (extFlags.duplicate_of_active) {
    return dec("silence", false, false, false, 0, "duplicate_lineage");
  }

  const stage = stageOf(signal);
  const gap = nextGapOf(signal);
  const actionable = actionableGap(gap);
  const usable = isUsableReality(signal);
  const suf = String(signal.shared_reality?.sufficiency || "").toLowerCase();
  const leaveRelevant = !!(signal as { leave_by_relevant?: boolean }).leave_by_relevant;
  const mins = inferMinutesUntil(signal, now);
  const deadline = inferActionDeadlineMinutes(signal, now);

  if (stage === "handled" || stage === "canceled") {
    return dec("ambient", false, false, false, 5, "handled_recede", "quiet");
  }

  // Quiet / empty intention — silence (not Home ambient)
  if (stage === "quiet" || (suf === "intention" && !hasDims(signal))) {
    return dec("silence", false, false, false, 0, "weak_intention");
  }

  // External deadline or leave window → time_sensitive (may outrank nearer low-urgency)
  if (leaveRelevant || (deadline != null && deadline >= 0 && deadline <= 120)) {
    return dec("time_sensitive", true, true, true, 55, "deadline_or_leave_window", "now");
  }

  // Personal immediate leave (travel horizon) without full usable settle
  if (mins != null && mins >= 0 && mins <= 45 && (usable || stage === "set" || stage === "ready")) {
    if ((signal as { personal?: boolean; composition?: string }).composition === "personal" ||
      (signal as { personal_reality?: boolean }).personal_reality) {
      return dec("time_sensitive", true, true, true, 58, "personal_leave_window", "now");
    }
  }

  if (actionable && signal.requires_user_action !== false) {
    return dec("action_required", true, true, false, 40, "next_gap_action", "now");
  }

  if (usable && (suf === "usable" || stage === "set" || stage === "ready")) {
    // Settled with no action: useful ambient, not CHOOSE awaken priority
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

/**
 * Full consequence-urgency score with internal reasons (never product labels).
 * Class base + temporal proximity + cost of delay + action/gap bonuses.
 */
export function scoreAttention(signal: ProductSignal, now: Date = new Date()): AttentionScoreExplain {
  const decision = evaluateAttention(signal, now);
  const gap = nextGapOf(signal);
  const minutesUntil = inferMinutesUntil(signal, now);
  const actionDeadlineMinutes = inferActionDeadlineMinutes(signal, now);
  const leaveRelevant = !!(signal as { leave_by_relevant?: boolean }).leave_by_relevant;

  const reasons: string[] = [`class:${decision.class}`, `base:${decision.reason}`];
  let priority = decision.priority;

  const temp = temporalProximityBonus(minutesUntil, leaveRelevant);
  priority += temp.bonus;
  reasons.push(...temp.reasons);

  const delay = costOfDelayBonus(signal, gap, minutesUntil, actionDeadlineMinutes);
  priority += delay.bonus;
  reasons.push(...delay.reasons);

  if (decision.class === "action_required" || decision.class === "time_sensitive" || decision.class === "critical") {
    priority += 20;
    reasons.push("actionability_bonus");
  }
  if (actionableGap(gap)) {
    priority += 10;
    reasons.push(`gap:${gap || "none"}`);
  }

  // Settled realities that need no decision should not keep CHOOSE-level urgency
  if (decision.class === "useful_now" && !actionableGap(gap)) {
    reasons.push("settled_no_action");
  }

  if (minutesUntil != null) {
    reasons.push(`minutes_until:${minutesUntil}`);
  }
  if (actionDeadlineMinutes != null) {
    reasons.push(`action_deadline_min:${actionDeadlineMinutes}`);
  }

  return {
    signal,
    decision: { ...decision, priority },
    priority,
    reasons,
    minutesUntil,
    actionDeadlineMinutes,
    gap,
  };
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
 * Select the single Home awaken candidate by consequence urgency.
 * Order-independent. No identity bias. Stable tiebreak by conversation_id.
 */
export function selectHomeAwaken(
  signals: ProductSignal[],
  now: Date = new Date(),
): { winner: ProductSignal | null; ranked: AttentionScoreExplain[] } {
  const ranked = signals
    .map((s) => scoreAttention(s, now))
    .filter((r) => r.decision.shouldSurfaceHome)
    .filter((r) => {
      // Awaken is for action / time-sensitive consequence — not mere ambient
      return (
        r.decision.class === "action_required" ||
        r.decision.class === "time_sensitive" ||
        r.decision.class === "critical" ||
        // leave useful_now out of CHOOSE unless execute job
        (r.decision.class === "useful_now" &&
          (r.signal.ui_job === "execute" || r.signal.shared_reality?.ui_job === "execute"))
      );
    })
    .sort((a, b) => {
      const d = b.priority - a.priority;
      if (d !== 0) return d;
      return String(a.signal.conversation_id || "").localeCompare(String(b.signal.conversation_id || ""));
    });

  return { winner: ranked[0]?.signal ?? null, ranked };
}

/**
 * Compress Home presence: sparse NOW / LATER / QUIET field.
 *
 * Ranking before caps (Pass 11/13):
 * 1) evaluate+score  2) collapse same conversation  3) sort by priority  4) band caps as rails
 */
export function composeHomeAttentionField(
  signals: ProductSignal[],
  opts?: { maxNow?: number; maxLater?: number; maxQuiet?: number; now?: Date },
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
  opts?: { maxNow?: number; maxLater?: number; maxQuiet?: number; now?: Date },
): HomeFieldExplain {
  const maxNow = opts?.maxNow ?? 2;
  const maxLater = opts?.maxLater ?? 3;
  const maxQuiet = opts?.maxQuiet ?? 1;
  const now = opts?.now ?? new Date();

  const candidates = signals.map((signal) => {
    const scored = scoreAttention(signal, now);
    return {
      signal,
      decision: scored.decision,
      band: scored.decision.band,
      reasons: scored.reasons,
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

  const afterCollapse = [...byLin.values()].sort((a, b) => {
    const d = b.decision.priority - a.decision.priority;
    if (d !== 0) return d;
    return String(a.signal.conversation_id || "").localeCompare(String(b.signal.conversation_id || ""));
  });

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
  if (!t || t.length < 2) return false;
  // Historical status / recompute noise
  if (/replaced\s+\w+/i.test(t) && /became|replaced/i.test(t)) {
    if (/replaced\s+(thursday|friday|saturday|sunday|monday|tuesday|wednesday)/i.test(t)) {
      return false;
    }
  }
  if (/recomputed|sync(ed)? successfully|signal updated/i.test(t)) return false;
  // Vague intermediate "forming" without a settled place/time upgrade
  if (/\bforming\b/i.test(t) && !/\b(became|is the|locked|set)\b/i.test(t)) {
    // "Dinner · forming" alone is Opal monologue, not a human consequence
    if (/^(dinner|coffee|lunch|plans?)\b/i.test(t) && t.split(/[·|]/).length <= 2) {
      return false;
    }
  }
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

/**
 * Home editorial — two lines for the Living Void headline.
 * Not a night-centric constant: adapts to daypart + whether action is needed.
 * Presentation only; does not change AttentionAuthority ranking.
 */
export function homeEditorialLines(opts?: {
  hour?: number;
  hasAction?: boolean;
  hasPresence?: boolean;
}): [string, string] {
  const hour = opts?.hour ?? new Date().getHours();
  const hasAction = !!opts?.hasAction;
  const hasPresence = !!opts?.hasPresence;

  if (hasAction) {
    if (hour >= 5 && hour < 12) return ["This morning", "needs you."];
    if (hour >= 12 && hour < 17) return ["Something", "needs you."];
    if (hour >= 17 && hour < 22) return ["Tonight", "needs you."];
    return ["What's next", "is clear."];
  }
  if (hasPresence) {
    if (hour >= 5 && hour < 12) return ["Today", "is taking shape."];
    if (hour >= 12 && hour < 17) return ["The day", "is open."];
    if (hour >= 17 && hour < 22) return ["Tonight", "is happening."];
    return ["Something", "is forming."];
  }
  if (hour >= 5 && hour < 12) return ["This morning", "is quiet."];
  if (hour >= 12 && hour < 17) return ["The day", "is open."];
  if (hour >= 17 && hour < 22) return ["Tonight", "is calm."];
  return ["The night", "is yours."];
}

/**
 * When to suppress a continuation CTA (capability exists ≠ show).
 * Presentation gate only — mirrors Pass 12 §14.
 */
export function shouldOfferContinuation(opts: {
  nextCommitmentSoon?: boolean;
  userAlreadyLeaving?: boolean;
  currentRealityIncomplete?: boolean;
  remoteEndingNaturally?: boolean;
}): boolean {
  if (opts.userAlreadyLeaving) return false;
  if (opts.remoteEndingNaturally) return false;
  if (opts.currentRealityIncomplete) return false;
  if (opts.nextCommitmentSoon) return false;
  return true;
}

/** Human-facing notification language samples (policy preview — no OS push). */
export function notificationCopyPreview(kind: "silent" | "ambient" | "actionable" | "superseded"): string | null {
  switch (kind) {
    case "silent":
      return null;
    case "ambient":
      return "Dinner with Jordan is still forming — no action needed yet.";
    case "actionable":
      return "Leave around 6:20 for dinner with Jordan.";
    case "superseded":
      return "Dinner is at 7:30 now. You have a little more time.";
  }
}

/**
 * Personal flow consequence copy — quiet next step only, never a task list.
 */
export function personalFlowConsequence(state: "early" | "work_end" | "pre_departure" | "on_track"): string | null {
  switch (state) {
    case "early":
      return null; // silence
    case "work_end":
      return "Work winds down around 5. Dinner with Jordan is at 7.";
    case "pre_departure":
      return "Leave around 6:20 for dinner with Jordan.";
    case "on_track":
      return null; // silence — no interference
  }
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
