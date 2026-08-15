/**
 * Social reality **presentation** (Pass 27 / H-24-02).
 *
 * SERVER OWNER: Elixir SocialReality.project → ProductSignals → shared_reality
 * CLIENT ROLE: prefer server structured fields; thin fallback only when absent.
 *
 * Does not invent a second intelligence brain. Label inference is bounded
 * presentation recovery for stale/thin signals — never overrides server next_gap
 * when present.
 */

import type { ProductSignal } from "../api/productClient";

export type NextGap =
  | "none"
  | "time"
  | "place"
  | "activity"
  | "participants"
  | "confirm_required_person"
  | "execution"
  | "transport";

export type RealityAction = {
  dimension: string;
  verb: string;
  label: string;
  opens: string;
  share_kind: "time" | "place" | "activity" | null;
};

export type SocialRealityView = {
  what: string | null;
  when: string | null;
  where: string | null;
  gaps: string[];
  next_gap: NextGap;
  primary_action: RealityAction | null;
  next_actions: RealityAction[];
  where_matters: boolean;
  remote: boolean;
  fixed_event: boolean;
  headline: string | null;
  lifecycle_stage: string | null;
};

function present(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function whereMatters(what: string | null, remote: boolean): boolean {
  if (remote) return false;
  if (!what) return false;
  if (/call|facetime|zoom|online|game|remote|phone|video/i.test(what)) return false;
  if (/dinner|coffee|lunch|drinks|sushi|restaurant|brunch|birthday/i.test(what)) return true;
  // Unknown activity — don't force place yet
  return false;
}

function remoteWhat(what: string | null): boolean {
  return !!what && /call|facetime|zoom|online|game|remote|phone|video/i.test(what);
}

/**
 * Present whole-picture reality + next gap from a ProductSignal.
 * Server structured shared_reality is canonical when present.
 */
export function deriveSocialReality(
  signal: ProductSignal | null | undefined,
): SocialRealityView {
  const sr = signal?.shared_reality as Record<string, unknown> | undefined;
  const hasServerStructure = !!(
    sr &&
    (present(sr.what) ||
      present(sr.when) ||
      present(sr.where) ||
      present(sr.next_gap) ||
      (Array.isArray(sr.gaps) && sr.gaps.length > 0))
  );

  let what = present(sr?.what) ? String(sr!.what) : null;
  let when = present(sr?.when) ? String(sr!.when) : null;
  let where = present(sr?.where) ? String(sr!.where) : null;
  let gaps = Array.isArray(sr?.gaps) ? (sr!.gaps as string[]).map(String) : [];

  // Thin fallback ONLY when server structure absent (stale/thin signal)
  const blob = `${signal?.label || ""} ${signal?.detail || ""} ${sr?.headline || ""} ${sr?.detail || ""} ${sr?.place_gap_label || ""}`;
  if (!hasServerStructure) {
    if (!what && /dinner/i.test(blob)) what = "Dinner";
    if (!what && /coffee/i.test(blob)) what = "Coffee";
    if (
      !when &&
      /(thursday|friday|saturday|tonight|tomorrow|\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))/i.test(blob)
    ) {
      when = signal?.label || (sr?.headline as string) || "Sometime";
    }
    if (
      !gaps.includes("where") &&
      !where &&
      /place still open|choosing (a |the )?place|where\b/i.test(blob)
    ) {
      gaps = [...gaps, "where"];
    }
    if (!gaps.includes("when") && !when && /need a time|find a time|when\b/i.test(blob)) {
      gaps = [...gaps, "when"];
    }
  }

  const remote =
    typeof sr?.remote === "boolean" ? (sr.remote as boolean) : remoteWhat(what);
  const where_matters =
    typeof sr?.where_matters === "boolean"
      ? (sr.where_matters as boolean)
      : whereMatters(what, remote);
  const fixed_event =
    typeof sr?.fixed_event === "boolean"
      ? (sr.fixed_event as boolean)
      : /concert|show|tickets?|rady shell/i.test(blob);

  // Prefer server next_gap when present — never invent against it
  const serverGap = sr?.next_gap as NextGap | undefined;
  const serverActions = sr?.next_actions as RealityAction[] | undefined;
  const serverPrimary = sr?.primary_action as RealityAction | undefined;

  const next_gap: NextGap =
    serverGap && isGap(serverGap)
      ? serverGap
      : deriveNextMeaningfulGap({
          gaps,
          what,
          when,
          where,
          where_matters,
          fixed_event,
          stage: signal?.lifecycle_stage,
        });

  // Daypart for continuation labels (presentation only; not a second Reality brain)
  const hour =
    typeof (sr as { hour?: number } | undefined)?.hour === "number"
      ? (sr as { hour: number }).hour
      : inferHourHint(when, blob);

  const next_actions =
    Array.isArray(serverActions) && serverActions.length
      ? serverActions
      : actionsForGap(next_gap, signal?.lifecycle_stage, {
          hour,
          remote,
          what,
        });

  const primary_action = serverPrimary || next_actions[0] || null;

  return {
    what,
    when,
    where,
    gaps,
    next_gap,
    primary_action,
    next_actions,
    where_matters,
    remote,
    fixed_event,
    headline: (sr?.headline as string) || signal?.label || null,
    lifecycle_stage: signal?.lifecycle_stage || null,
  };
}

/** Presentation-only hour hint for continuation labels — not server authority. */
function inferHourHint(when: string | null, blob: string): number {
  const t = `${when || ""} ${blob}`;
  if (/\b(morning|breakfast|coffee|9\s*am|10\s*am|11\s*am)\b/i.test(t)) return 9;
  if (/\b(noon|brunch|lunch|1\s*pm|2\s*pm|3\s*pm|afternoon)\b/i.test(t)) return 14;
  if (/\b(dinner|evening|6\s*pm|7\s*pm|8\s*pm)\b/i.test(t)) return 19;
  if (/\b(night|late|concert|jazz|11\s*pm|midnight)\b/i.test(t)) return 22;
  if (/\b(facetime|zoom|call|remote)\b/i.test(t)) return 15;
  return 19;
}

/**
 * Contextual continuation label — mirrors ExperienceContinuation daypart law.
 * Domain verb stays "continue"; "extend" is legacy surface open target only.
 */
export function continuationLabel(opts: {
  hour?: number;
  remote?: boolean;
  solo?: boolean;
}): { verb: string; label: string; opens: string; daypart: string } {
  const hour = typeof opts.hour === "number" ? opts.hour : 19;
  let daypart = "evening";
  if (opts.remote) daypart = "remote";
  else if (hour >= 5 && hour < 12) daypart = "morning";
  else if (hour >= 12 && hour < 17) daypart = "afternoon";
  else if (hour >= 17 && hour < 21) daypart = "evening";
  else daypart = "night";

  const labels: Record<string, string> = {
    morning: "Keep the morning going",
    afternoon: "Keep the day going",
    evening: "Keep the evening going",
    night: "Extend the night",
    remote: "Keep hanging out",
  };
  return {
    verb: "continue",
    label: labels[daypart] || "Continue",
    opens: "extend",
    daypart,
  };
}

export function deriveNextMeaningfulGap(input: {
  gaps: string[];
  what: string | null;
  when: string | null;
  where: string | null;
  where_matters: boolean;
  fixed_event?: boolean;
  stage?: string | null;
}): NextGap {
  const stage = input.stage || "";
  if (stage === "handled" || stage === "canceled" || stage === "quiet") return "none";

  const gaps = [...input.gaps];
  // Recompute from dimensions if gaps empty
  if (!present(input.when) && !gaps.includes("when")) gaps.push("when");
  if (
    input.where_matters &&
    !present(input.where) &&
    !gaps.includes("where") &&
    (present(input.when) || stage === "set" || stage === "ready" || stage === "still_open")
  ) {
    gaps.push("where");
  }
  if (!present(input.what) && !gaps.includes("what") && stage !== "quiet") {
    // only if planning has started
    if (stage === "plan_forming" || stage === "still_open") gaps.push("what");
  }

  if (input.fixed_event && gaps.includes("who")) return "participants";

  // Order-agnostic: missing WHEN is time gap; missing WHERE (when place matters) is place.
  // Place-first: where known + when unknown → time. Time-first: when known + where open → place.
  if (!present(input.when) || gaps.includes("when")) {
    if (!present(input.when)) return "time";
  }

  if (input.where_matters && (!present(input.where) || gaps.includes("where"))) {
    return "place";
  }

  if (!present(input.what) || gaps.includes("what")) {
    if (stage === "plan_forming" || stage === "still_open") return "activity";
  }

  if (gaps.includes("who") || gaps.includes("confirmation")) {
    return "confirm_required_person";
  }
  return "none";
}

function isGap(g: string): g is NextGap {
  return [
    "none",
    "time",
    "place",
    "activity",
    "participants",
    "confirm_required_person",
    "execution",
    "transport",
  ].includes(g);
}

export function actionsForGap(
  gap: NextGap,
  stage?: string | null,
  ctx?: { hour?: number; remote?: boolean; what?: string | null },
): RealityAction[] {
  switch (gap) {
    case "time":
      return [
        {
          dimension: "when",
          verb: "resolve",
          label: "Find a time",
          opens: "time_sheet",
          share_kind: "time",
        },
      ];
    case "place":
      return [
        {
          dimension: "where",
          verb: "resolve",
          label: "Choose a place",
          opens: "place_sheet",
          share_kind: "place",
        },
        {
          dimension: "where",
          verb: "curate",
          label: "Curate a place",
          opens: "curate",
          share_kind: "place",
        },
      ];
    case "activity":
      return [
        {
          dimension: "what",
          verb: "resolve",
          label: "What's the plan?",
          opens: "activity",
          share_kind: "activity",
        },
      ];
    case "none":
      if (stage === "set" || stage === "ready") {
        // Fixed events / remote: still may continue — but never invent "Find a time"
        const cont = continuationLabel({
          hour: ctx?.hour,
          remote: ctx?.remote || remoteWhat(ctx?.what ?? null),
        });
        // Suppress night-only phrasing for morning/afternoon/remote
        return [
          {
            dimension: "execution",
            verb: cont.verb === "continue" ? "continue" : "extend",
            label: cont.label,
            opens: cont.opens,
            share_kind: null,
          },
        ];
      }
      return [];
    default:
      return [];
  }
}

/** Build a place-share draft — NEVER availability windows. */
export function buildPlaceShareDraft(place: {
  name: string;
  area?: string | null;
}): { share_kind: "place"; text: string; place_name: string; area?: string } {
  const text = place.area
    ? `${place.name} · ${place.area}?`
    : `${place.name}?`;
  return {
    share_kind: "place",
    text,
    place_name: place.name,
    area: place.area || undefined,
  };
}

/** Build a time-share draft — NEVER place settlement alone. */
export function buildTimeShareDraft(label: string): {
  share_kind: "time";
  text: string;
} {
  return {
    share_kind: "time",
    text: `${label} works for me — does that work for you?`,
  };
}

export function assertPlaceSharePayload(payload: Record<string, unknown>): void {
  if (payload.share_kind !== "place" && payload.dimension !== "where") {
    throw new Error("PLACE_SHARE_NEVER_SERIALIZES_TIME_ONLY_PAYLOAD: wrong kind");
  }
  if (payload.windows || payload.display_start || payload.availability_window_ids) {
    throw new Error("PLACE_SHARE_NEVER_SERIALIZES_TIME_ONLY_PAYLOAD");
  }
  if (!payload.place_name && !payload.text) {
    throw new Error("place share missing place content");
  }
}

export function assertTimeSharePayload(payload: Record<string, unknown>): void {
  if (
    payload.share_kind !== "time" &&
    payload.dimension !== "when" &&
    !payload.windows &&
    !payload.display_start &&
    !payload.text
  ) {
    throw new Error("time share missing time content");
  }
}

/**
 * Cross-surface truth check: Home / Chat / SR / Plans must agree on dimensions + gap.
 * Presentation wording may differ; truth may not.
 */
export function assertRealityConsistency(
  views: Array<{ source: string; reality: SocialRealityView }>,
): void {
  if (views.length < 2) return;
  const base = views[0].reality;
  for (const v of views.slice(1)) {
    if (v.reality.next_gap !== base.next_gap) {
      throw new Error(
        `reality split-brain: ${views[0].source} next_gap=${base.next_gap} vs ${v.source}=${v.reality.next_gap}`,
      );
    }
    if ((v.reality.what || null) !== (base.what || null)) {
      throw new Error(
        `reality split-brain: what mismatch ${views[0].source}/${v.source}`,
      );
    }
    if ((v.reality.when || null) !== (base.when || null)) {
      throw new Error(
        `reality split-brain: when mismatch ${views[0].source}/${v.source}`,
      );
    }
    if ((v.reality.where || null) !== (base.where || null)) {
      throw new Error(
        `reality split-brain: where mismatch ${views[0].source}/${v.source}`,
      );
    }
  }
}

/** Private leave-around label - only when start + travel minutes known. Never invent. */
export function formatLeaveAround(
  startIso: string | null | undefined,
  travelMinutes: number | null | undefined,
): string | null {
  if (!startIso || travelMinutes == null || travelMinutes < 0) return null;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  // default 10m buffer matches Feasibility.Buffer
  const leave = new Date(start.getTime() - (travelMinutes + 10) * 60_000);
  const time = leave.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Leave around ${time}`;
}

export function formatDistanceMinutes(travelMinutes: number | null | undefined): string | null {
  if (travelMinutes == null || travelMinutes < 0) return null;
  return `${Math.round(travelMinutes)} min from you`;
}
