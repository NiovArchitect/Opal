/**
 * Personal flow orchestration (Pass 14).
 *
 * Not a planner / agenda / task timeline.
 * Projects personal + shared realities into the next meaningful consequence
 * using AttentionAuthority. Silence is first-class.
 */

import type { ProductSignal } from "../api/productClient";
import {
  continuationLabel,
  evaluateAttention,
  scoreAttention,
  shouldOfferContinuation,
  type AttentionDecision,
} from "./attentionAuthority";

export type FlowKind =
  | "silence"
  | "optional_transition"
  | "leave_window"
  | "decision"
  | "continuation_eligible"
  | "ambient";

export type FlowConsequence = {
  realityId: string;
  kind: FlowKind;
  humanConsequence: string | null;
  actionability: "none" | "optional" | "required" | "time_sensitive";
  attention: AttentionDecision;
  deliveryEligible: boolean;
  supersessionKey: string;
  privacyClass: "actor_private" | "shared_safe";
  sourceProvenance: string[];
  minutesUntil: number | null;
  /** Internal only — never product score dump */
  reasons: string[];
};

export type PersonalDayContext = {
  now?: Date;
  /** Minutes until work ends (null = unknown / not working) */
  workEndsInMinutes?: number | null;
  /** Optional personal errand with soft window */
  optionalErrand?: {
    id?: string;
    label?: string;
    /** Estimated duration minutes */
    durationMinutes?: number;
    feasible?: boolean;
  } | null;
  /** Authoritative travel minutes for next commitment (synthetic OK) */
  travelMinutes?: number | null;
  travelProvenance?: {
    origin?: string;
    destination?: string;
    mode?: string;
    duration?: number;
    observed_at?: string;
    source?: string;
  } | null;
  /** User already travelling / on track for next leave */
  alreadyTravelling?: boolean;
  /** App actively showing the relevant conversation */
  appActiveOnRealityId?: string | null;
  /** Hour override for continuation daypart */
  hour?: number;
};

/**
 * Compose the single best personal-flow consequence for this moment.
 * Does not merge realities into one plan or list all commitments.
 */
export function composePersonalFlow(
  signals: ProductSignal[],
  ctx: PersonalDayContext = {},
): FlowConsequence {
  const now = ctx.now ?? new Date();
  const hour = ctx.hour ?? now.getHours();

  // Rank realities with frozen AttentionAuthority
  const scored = signals
    .filter((s) => s.kind !== "proposal")
    .map((s) => scoreAttention(s, now))
    .sort((a, b) => b.priority - a.priority);

  const top = scored[0];
  const workEnds = ctx.workEndsInMinutes;
  const travel = ctx.travelMinutes ?? ctx.travelProvenance?.duration ?? null;

  // --- Early silence: far from work end, no leave window, no required decision ---
  // Settled far dinner is ambient truth, not a 3 PM interruption.
  if (
    (workEnds == null || workEnds > 90) &&
    !hasImminentLeave(top, travel, now) &&
    (!top ||
      top.decision.class === "silence" ||
      top.decision.class === "ambient" ||
      top.decision.class === "useful_now" ||
      (top.minutesUntil != null && top.minutesUntil > 90 && top.decision.class !== "action_required"))
  ) {
    if (!top || top.decision.class !== "action_required" && top.decision.class !== "time_sensitive" && top.decision.class !== "critical") {
      return silence("early_or_no_consequence", ["no_near_transition"]);
    }
  }

  // --- On track: already travelling ---
  if (ctx.alreadyTravelling) {
    return silence("on_track", ["already_travelling_suppress_leave"]);
  }

  // --- Pre-leave: travel + next commitment ---
  if (top && travel != null && travel > 0) {
    const minsUntilEvent = top.minutesUntil;
    if (minsUntilEvent != null && minsUntilEvent >= 0 && minsUntilEvent <= travel + 45) {
      const leaveIn = Math.max(0, minsUntilEvent - travel);
      if (leaveIn <= 45) {
        const who = peerHint(top.signal);
        const copy =
          leaveIn <= 5
            ? who
              ? `Leave now for dinner with ${who}.`
              : "Leave now for your plan."
            : who
              ? `Leave around ${formatLeaveClock(now, leaveIn)} for dinner with ${who}.`
              : `Leave around ${formatLeaveClock(now, leaveIn)} for your plan.`;
        const attention = evaluateAttention(
          {
            ...top.signal,
            leave_by_relevant: true,
            minutes_until: leaveIn,
          } as ProductSignal & { leave_by_relevant: boolean; minutes_until: number },
          now,
        );
        return {
          realityId: top.signal.conversation_id || "personal",
          kind: "leave_window",
          humanConsequence: copy,
          actionability: "time_sensitive",
          attention: { ...attention, priority: attention.priority + 40 },
          deliveryEligible: true,
          supersessionKey: `leave:${top.signal.conversation_id || "x"}:${leaveIn}`,
          privacyClass: "actor_private",
          sourceProvenance: [
            "attention_authority",
            "travel_truth",
            ctx.travelProvenance?.source || "synthetic_authoritative",
          ],
          minutesUntil: leaveIn,
          reasons: ["leave_window", `travel_min:${travel}`, `event_in:${minsUntilEvent}`],
        };
      }
    }
  }

  // --- Work end transition: optional errand if slack exists ---
  if (workEnds != null && workEnds >= 0 && workEnds <= 30) {
    const next = top;
    const nextMins = next?.minutesUntil ?? null;
    const errand = ctx.optionalErrand;
    const errandDur = errand?.durationMinutes ?? 30;
    if (
      errand &&
      errand.feasible !== false &&
      nextMins != null &&
      nextMins > workEnds + errandDur + (travel || 0) + 15
    ) {
      return {
        realityId: errand.id || "personal-errand",
        kind: "optional_transition",
        humanConsequence: errand.label
          ? `You've got time for ${errand.label} before dinner.`
          : "You've got time for that stop before dinner.",
        actionability: "optional",
        attention: {
          class: "useful_now",
          shouldSurfaceHome: false,
          shouldSurfaceChatFilament: false,
          shouldInterrupt: false,
          priority: 25,
          reason: "optional_slack",
          band: "later",
        },
        deliveryEligible: false,
        supersessionKey: `optional:${errand.id || "errand"}`,
        privacyClass: "actor_private",
        sourceProvenance: ["personal_flow", "optional_not_obligation"],
        minutesUntil: workEnds,
        reasons: ["work_end_slack", "optional_errand_feasible"],
      };
    }
    // Work ending without useful optional — quiet or surface decision if needed
    if (next && next.decision.class === "action_required") {
      return decisionFromScore(next, "work_end_decision");
    }
    return silence("work_end_no_obligation", ["no_required_transition"]);
  }

  // --- Decision: place/time open on a near reality ---
  if (top && (top.decision.class === "action_required" || top.decision.class === "time_sensitive")) {
    return decisionFromScore(top, "attention_action_required");
  }

  // --- Continuation eligibility (capability, not auto CTA) ---
  const contOk = shouldOfferContinuation({
    nextCommitmentSoon: (top?.minutesUntil ?? 9999) < 90,
    userAlreadyLeaving: !!ctx.alreadyTravelling,
    currentRealityIncomplete: top?.decision.class === "action_required",
  });
  if (contOk && top?.decision.class === "useful_now") {
    const label = continuationLabel({ hour, solo: true });
    return {
      realityId: top.signal.conversation_id || "continue",
      kind: "continuation_eligible",
      humanConsequence: label,
      actionability: "optional",
      attention: top.decision,
      deliveryEligible: false,
      supersessionKey: `cont:${top.signal.conversation_id || "x"}:${hour}`,
      privacyClass: "actor_private",
      sourceProvenance: ["experience_continuation"],
      minutesUntil: top.minutesUntil,
      reasons: ["continuation_daypart", label],
    };
  }

  if (top && top.decision.shouldSurfaceHome) {
    return {
      realityId: top.signal.conversation_id || "ambient",
      kind: "ambient",
      humanConsequence: null,
      actionability: "none",
      attention: top.decision,
      deliveryEligible: false,
      supersessionKey: `ambient:${top.signal.conversation_id || "x"}`,
      privacyClass: "actor_private",
      sourceProvenance: ["attention_authority"],
      minutesUntil: top.minutesUntil,
      reasons: top.reasons,
    };
  }

  return silence("default", ["nothing_matters_now"]);
}

function decisionFromScore(
  top: ReturnType<typeof scoreAttention>,
  reason: string,
): FlowConsequence {
  const who = peerHint(top.signal);
  const gap = top.gap;
  let copy: string | null = null;
  if (gap === "place") {
    copy = who ? `Where should dinner be with ${who}?` : "Where should dinner be?";
  } else if (gap === "time") {
    copy = who ? `Find a time with ${who}.` : "Find a time.";
  }
  return {
    realityId: top.signal.conversation_id || "decision",
    kind: "decision",
    humanConsequence: copy,
    actionability: top.decision.class === "time_sensitive" ? "time_sensitive" : "required",
    attention: top.decision,
    deliveryEligible: top.decision.class === "time_sensitive",
    supersessionKey: `decision:${top.signal.conversation_id || "x"}:${gap}`,
    privacyClass: "actor_private",
    sourceProvenance: ["attention_authority", reason],
    minutesUntil: top.minutesUntil,
    reasons: top.reasons,
  };
}

function silence(reason: string, extra: string[] = []): FlowConsequence {
  return {
    realityId: "_silence",
    kind: "silence",
    humanConsequence: null,
    actionability: "none",
    attention: {
      class: "silence",
      shouldSurfaceHome: false,
      shouldSurfaceChatFilament: false,
      shouldInterrupt: false,
      priority: 0,
      reason,
      band: "quiet",
    },
    deliveryEligible: false,
    supersessionKey: `silence:${reason}`,
    privacyClass: "actor_private",
    sourceProvenance: ["personal_flow"],
    minutesUntil: null,
    reasons: [reason, ...extra],
  };
}

function hasImminentLeave(
  top: ReturnType<typeof scoreAttention> | undefined,
  travel: number | null,
  _now: Date,
): boolean {
  if (!top || travel == null) return false;
  const m = top.minutesUntil;
  if (m == null) return false;
  return m - travel <= 45 && m - travel >= 0;
}

function peerHint(signal: ProductSignal): string | null {
  const label = signal.label || "";
  // Avoid dumping multi-name groups
  if (label.includes(",")) return "friends";
  const name = label.split("·")[0]?.trim();
  if (name && name.length < 40 && !/dinner|coffee|lunch/i.test(name)) return name;
  return null;
}

function formatLeaveClock(now: Date, leaveInMinutes: number): string {
  const d = new Date(now.getTime() + leaveInMinutes * 60000);
  const h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${h12}:${mm} ${ap}`;
}

/** Simulated-time timeline for EP-010 style personal day proofs. */
export function personalDayTimeline(signals: ProductSignal[]): Array<{
  label: string;
  hour: number;
  minute: number;
  flow: FlowConsequence;
}> {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const points = [
    { label: "3pm_work", hour: 15, minute: 0, workEndsInMinutes: 120, travelMinutes: 25 },
    {
      label: "5pm_work_end",
      hour: 17,
      minute: 0,
      workEndsInMinutes: 0,
      travelMinutes: 25,
      optionalErrand: { id: "errand", label: "that stop", durationMinutes: 25, feasible: true },
    },
    { label: "6_20_leave", hour: 18, minute: 20, workEndsInMinutes: -80, travelMinutes: 25 },
    {
      label: "on_track",
      hour: 18,
      minute: 25,
      workEndsInMinutes: -85,
      travelMinutes: 25,
      alreadyTravelling: true,
    },
  ];
  return points.map((p) => {
    const now = new Date(base);
    now.setHours(p.hour, p.minute, 0, 0);
    // Adjust minutes_until on signals relative to simulated now via when labels
    const flow = composePersonalFlow(signals, {
      now,
      hour: p.hour,
      workEndsInMinutes: p.workEndsInMinutes,
      travelMinutes: p.travelMinutes,
      optionalErrand: "optionalErrand" in p ? p.optionalErrand : null,
      alreadyTravelling: "alreadyTravelling" in p ? !!p.alreadyTravelling : false,
      travelProvenance: {
        origin: "work",
        destination: "dinner",
        mode: "driving",
        duration: p.travelMinutes,
        observed_at: now.toISOString(),
        source: "synthetic_authoritative",
      },
    });
    return { label: p.label, hour: p.hour, minute: p.minute, flow };
  });
}
