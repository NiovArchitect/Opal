/**
 * Shared Reality UI projection helpers.
 *
 * Thin client mapping over ProductSignals / SharedRealityPresentation.
 * Does not invent plan authority  -  only formats and filters for REVEAL /
 * RESOLVE / EXECUTE / RECALL surfaces.
 */

import type { ProductSignal } from "./api/productClient";
import {
  composeHumanReality,
  dedupeTemporalLabel,
  formatClockAmPm,
} from "./opalUi/composeHumanReality";
import { formatHistoryInstant } from "./opalUi/historyTime";

export type UiJob = "reveal" | "resolve" | "execute" | "recall";
export type Sufficiency = "intention" | "converging" | "usable";

export type SharedRealityView = {
  what?: string | null;
  when?: string | null;
  where?: string | null;
  gaps?: string[];
  sufficiency?: Sufficiency | string;
  ui_job?: UiJob | string;
  headline?: string | null;
  detail?: string | null;
  usable?: boolean;
  plans_durable?: boolean;
};

/** Prefer human shared-reality headline; never invent "Set" as a badge. */
export function surfaceLabel(signal: ProductSignal | undefined | null): string | undefined {
  if (!signal) return undefined;
  const sr = signal.shared_reality;
  const label = (sr?.headline || signal.label || "").trim();
  if (!label) return undefined;
  // Guard: internal stage tokens must not reach the shell.
  if (/^(set|still open|this could work|becoming a plan)$/i.test(label)) {
    return sr?.detail || signal.detail || signal.evidence_preview || "In conversation";
  }
  return label;
}

export function signalDetail(signal: ProductSignal | undefined | null): string | undefined {
  if (!signal) return undefined;
  return (
    signal.shared_reality?.detail ||
    signal.detail ||
    signal.evidence_preview ||
    undefined
  );
}

export function isUsableReality(signal: ProductSignal): boolean {
  const sr = signal.shared_reality;
  if (sr?.usable === true || sr?.["usable?"] === true) return true;
  if (sr?.sufficiency === "usable") return true;
  return signal.lifecycle_stage === "set" || signal.lifecycle_stage === "ready";
}

export function isDurableForPlans(signal: ProductSignal): boolean {
  // Plans: usable shared realities + strongly converging  -  not weak intention.
  if (signal.kind === "proposal") return false;
  const stage = signal.lifecycle_stage || "";
  if (stage === "canceled" || stage === "quiet") return false;
  const sr = signal.shared_reality;
  if (sr?.plans_durable === true || sr?.["plans_durable?"] === true) return true;
  if (sr?.sufficiency === "usable") return true;
  if (stage === "set" || stage === "ready" || stage === "handled") return true;
  // Strongly converging: still open but has what+when
  if (stage === "still_open" && sr?.what && sr?.when) return true;
  return false;
}

function nextGapKey(signal: ProductSignal): string {
  const sr = signal.shared_reality as
    | { next_gap?: string; gaps?: string[] }
    | undefined;
  const g =
    (signal as { next_gap?: string }).next_gap ||
    sr?.next_gap ||
    (Array.isArray(sr?.gaps) ? sr!.gaps!.find((x) => x && x !== "none") : "") ||
    "";
  return String(g).toLowerCase();
}

function isActionableHumanGap(gap: string): boolean {
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
 * True when the human still has a useful decision / confirmation.
 * Pass 13: place/time open on stage "set" is still a need — stage alone is not enough.
 */
export function isConsequentialNeed(signal: ProductSignal): boolean {
  if (signal.kind === "proposal") return false;
  if (signal.requires_user_action === false) return false;
  const job = signal.ui_job || signal.shared_reality?.ui_job;
  if (job === "resolve" || job === "execute") return true;
  const gap = nextGapKey(signal);
  if (isActionableHumanGap(gap)) return true;
  const stage = signal.lifecycle_stage || "";
  return stage === "still_open" || stage === "plan_forming" || stage === "will_know_later";
}

/**
 * Peer/conversation collapse rank for Home.
 * Pass 13: actionable unresolved outranks settled "set" so multi-seed Jordan
 * pollution cannot hide a place-open reality behind an older settled dinner.
 */
function signalRank(s: ProductSignal): number {
  // Proposal rows are detail satellites  -  never the primary list signal.
  if (s.kind === "proposal") return 5;
  const gap = nextGapKey(s);
  const actionable = isActionableHumanGap(gap) && s.requires_user_action !== false;
  if (actionable) {
    // Base high so actionable beats settled set (50).
    let rank = 70;
    const when = String(s.shared_reality?.when || "").toLowerCase();
    // Nearer action horizons beat far weekdays for same-peer collapse.
    if (/\btonight\b|\btoday\b/.test(when)) rank += 20;
    else if (
      /^\s*\d{1,2}(?::\d{2})?\s*(am|pm)?\s*$/i.test(when.trim()) ||
      (/^\s*\d{1,2}:\d{2}/.test(when) && !/\b(mon|tue|wed|thu|fri|sat|sun|day)\b/i.test(when))
    ) {
      // Bare clock "6:30" / "7:00 PM" — treat as near-horizon social time
      rank += 18;
    } else if (/\btomorrow\b/.test(when)) rank += 12;
    else if (/\b(saturday|sunday|sat|sun)\b/.test(when)) rank += 6;
    else if (/\b(monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|fri)\b/.test(when)) {
      rank += 5;
    }
    return rank;
  }
  const stage = s.lifecycle_stage || "";
  if (stage === "set" || stage === "ready") return 50;
  if (stage === "still_open") return 40;
  if (stage === "plan_forming") return 30;
  if (stage === "will_know_later") return 20;
  if (stage === "handled") return 15;
  return 10;
}

/** One strongest signal per conversation for list/home surfaces. */
export function strongestPerConversation(signals: ProductSignal[]): ProductSignal[] {
  const byConv = new Map<string, ProductSignal>();
  for (const s of signals) {
    const cid = s.conversation_id || "_";
    const prev = byConv.get(cid);
    if (!prev || signalRank(s) > signalRank(prev)) byConv.set(cid, s);
  }
  return [...byConv.values()];
}

/**
 * Home living field: one presence per peer (or group conversation).
 * Prevents multi-seed Jordan pollution without collapsing genuine group rows.
 * peerKeyByConversation maps conversation_id → stable peer/group key (not display name alone).
 */
export function strongestPerHomePresence(
  signals: ProductSignal[],
  peerKeyByConversation: Map<string, string>,
): ProductSignal[] {
  const byConv = strongestPerConversation(signals);
  const byPeer = new Map<string, ProductSignal>();
  for (const s of byConv) {
    const cid = s.conversation_id || "_";
    const peerKey =
      peerKeyByConversation.get(cid) ||
      (s.composition === "group" ? `group:${cid}` : cid);
    const prev = byPeer.get(peerKey);
    if (!prev || signalRank(s) > signalRank(prev)) byPeer.set(peerKey, s);
  }
  return [...byPeer.values()];
}

/** Human-relative time for list rows — always 12h with AM/PM when a clock is shown. */
export function formatHumanTime(
  isoOrLabel: string | undefined | null,
  now: Date = new Date(),
): string {
  if (!isoOrLabel) return "";
  const raw = isoOrLabel.trim();
  if (!raw) return "";

  // ISO. Ages from a clock, to yesterday, to a weekday, then to a calendar date.
  if (/^\d{4}-\d{2}-\d{2}/.test(raw) || raw.includes("T")) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return formatHistoryInstant(d, now);
  }

  // Free text — ensure AM/PM and dedupe
  const withClock = formatClockAmPm(raw) || raw;
  return dedupeTemporalLabel(withClock);
}

/** Leave-by style maturation when event is soon (minutes). */
export function formatLeaveIn(isoOrLabel: string | undefined | null): string | null {
  if (!isoOrLabel) return null;
  const raw = isoOrLabel.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw) && !raw.includes("T")) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (mins > 0 && mins <= 120) return `Leave in ${mins} min`;
  return null;
}

/**
 * Human presence line for Home: WHAT · WHEN · WHERE or gap.
 * Never surfaces Set / Still open / Needs you.
 */
export function presenceLines(signal: ProductSignal | undefined | null): {
  title: string;
  detail: string;
  gap?: string;
  composition?: string;
  memberCount?: number;
} {
  if (!signal) return { title: "In conversation", detail: "" };

  // Group: compress to social reality, never constraint spreadsheet.
  // e.g. Saturday dinner · 6 people · 7:30 · Choosing the place
  const gc = signal.group_composition;
  const hs = gc?.human_surface;
  if (signal.composition === "group" || gc?.composition === "group" || (gc?.member_count ?? 0) >= 3) {
    const what = (signal.shared_reality?.what || "").trim() || "Dinner";
    const day = gc?.when?.day;
    const whenRaw =
      hs?.when_line ||
      gc?.when?.strongest_common_start ||
      (signal.shared_reality?.when || "").trim() ||
      null;
    const placeKnown = (gc?.where?.known_place || signal.shared_reality?.where || "").trim();
    const placeLine =
      placeKnown ||
      hs?.place_line ||
      signal.shared_reality?.place_gap_label ||
      "Choosing the place";
    const gap =
      placeKnown
        ? undefined
        : placeLine.includes("still open") || placeLine.includes("Choosing")
          ? placeLine
          : "Choosing the place";
    const composed = composeHumanReality({
      what,
      when: whenRaw || (day ? String(day) : null),
      where: placeKnown || null,
      gap: placeKnown ? null : gap,
    });
    const whoLine =
      hs?.who_line ||
      (gc?.who?.member_count ? `${gc.who.member_count} people` : null) ||
      (signal.member_count ? `${signal.member_count} people` : null);
    // Title = social what only; detail = people · one when · place/gap (no triple day)
    const detail = [whoLine, composed.presenceDetail || null]
      .filter(Boolean)
      .join(" · ");
    return {
      title: composed.presenceTitle || what || "Together",
      detail: detail || hs?.headline || "",
      gap: placeKnown ? undefined : gap,
      composition: "group",
      memberCount: gc?.who?.member_count || gc?.member_count || signal.member_count,
    };
  }

  const sr = signal.shared_reality;
  const what = (sr?.what || "").trim();
  const whenRaw = (sr?.when || "").trim();
  const where = (sr?.where || "").trim();
  const gaps = (sr?.gaps || []) as string[];

  let gap: string | undefined;
  const placeGapLabel = (sr as { place_gap_label?: string } | undefined)?.place_gap_label;
  const gapKey = gaps.find((g) => /place|where|venue|location|home/i.test(String(g)));
  if (where) {
    gap = undefined;
  } else if (placeGapLabel) {
    gap = placeGapLabel;
  } else if (gapKey || (!where && (what || whenRaw) && !isUsableReality(signal))) {
    const gStr = String(gapKey || "");
    if (/home|house|my place|their place/i.test(gStr + " " + (signal.detail || ""))) {
      gap = "At home · confirming";
    } else if (/downtown|neighborhood|area|city|north park|little italy/i.test(gStr + " " + (signal.detail || ""))) {
      gap = "Area known · choosing the place";
    } else if (/italian|sushi|coffee|bar|food/i.test(what + " " + (signal.detail || ""))) {
      gap = "Choosing the place";
    } else {
      gap = "Place still open";
    }
  } else if (gaps.length) {
    const g0 = String(gaps[0]);
    if (/time|when/i.test(g0)) gap = "Need a time";
    else if (/who|people/i.test(g0)) gap = "Still figuring who's in";
    else gap = undefined;
  }

  const composed = composeHumanReality({
    what: what || surfaceLabel(signal) || null,
    when: whenRaw || null,
    where: where || null,
    gap: gap || null,
  });

  // Title = what only; detail = one when · gap/place — no triple Thursday
  // Home gap language: "Choose the place" when place is next, not stale Find a time
  const homeGap =
    gap && /place|where|open/i.test(gap)
      ? "Choose the place"
      : gap;

  return {
    title: composed.presenceTitle || composed.headline || "In conversation",
    detail:
      composed.presenceDetail ||
      signalDetail(signal) ||
      "",
    gap: homeGap,
  };
}
