/**
 * Shared Reality UI projection helpers.
 *
 * Thin client mapping over ProductSignals / SharedRealityPresentation.
 * Does not invent plan authority  -  only formats and filters for REVEAL /
 * RESOLVE / EXECUTE / RECALL surfaces.
 */

import type { ProductSignal } from "./api/productClient";

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

export function isConsequentialNeed(signal: ProductSignal): boolean {
  if (signal.kind === "proposal") return false;
  if (signal.requires_user_action === false) return false;
  const job = signal.ui_job || signal.shared_reality?.ui_job;
  if (job === "resolve" || job === "execute") return true;
  const stage = signal.lifecycle_stage || "";
  return stage === "still_open" || stage === "plan_forming" || stage === "will_know_later";
}

/** One strongest signal per conversation for list/home surfaces. */
export function strongestPerConversation(signals: ProductSignal[]): ProductSignal[] {
  const rank = (s: ProductSignal): number => {
    // Proposal rows are detail satellites  -  never the primary list signal.
    if (s.kind === "proposal") return 5;
    const stage = s.lifecycle_stage || "";
    if (stage === "set" || stage === "ready") return 50;
    if (stage === "still_open") return 40;
    if (stage === "plan_forming") return 30;
    if (stage === "will_know_later") return 20;
    if (stage === "handled") return 15;
    return 10;
  };

  const byConv = new Map<string, ProductSignal>();
  for (const s of signals) {
    const cid = s.conversation_id || "_";
    const prev = byConv.get(cid);
    if (!prev || rank(s) > rank(prev)) byConv.set(cid, s);
  }
  return [...byConv.values()];
}

/** Human-relative time for list rows (avoid raw ISO). */
export function formatHumanTime(isoOrLabel: string | undefined | null): string {
  if (!isoOrLabel) return "";
  const raw = isoOrLabel.trim();
  if (!raw) return "";
  // Already human (demo or relative)
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw) && !raw.includes("T")) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) {
    // Temporal maturation: tonight when evening, else time only
    if (d.getHours() >= 17) return `Tonight · ${time}`;
    return time;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) {
    return `Tomorrow · ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 0 && days > -7) {
    return `${d.toLocaleDateString([], { weekday: "long" })} · ${time}`;
  }
  if (days > 0 && days < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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
} {
  if (!signal) return { title: "In conversation", detail: "" };
  const sr = signal.shared_reality;
  const what = (sr?.what || "").trim();
  const whenRaw = (sr?.when || "").trim();
  const where = (sr?.where || "").trim();
  const gaps = (sr?.gaps || []) as string[];
  const when = formatHumanTime(whenRaw) || whenRaw;
  const leave = formatLeaveIn(whenRaw);

  const title =
    surfaceLabel(signal) ||
    [what, when].filter(Boolean).join(" · ") ||
    "In conversation";

  const parts: string[] = [];
  if (what && !title.toLowerCase().includes(what.toLowerCase())) parts.push(what);
  if (when) parts.push(leave || when);
  if (where) parts.push(where);

  let gap: string | undefined;
  const gapKey = gaps.find((g) => /place|where|venue|location|home/i.test(String(g)));
  if (where) {
    // place known - do not invent gap
    gap = undefined;
  } else if (gapKey || (!where && (what || when) && !isUsableReality(signal))) {
    // Strongest known place truth without fabrication
    const gStr = String(gapKey || "");
    if (/home|house|my place|their place/i.test(gStr + " " + (signal.detail || ""))) {
      gap = "At home · confirming";
    } else if (/downtown|neighborhood|area|city/i.test(gStr + " " + (signal.detail || ""))) {
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

  if (gap && !parts.some((p) => p === gap)) parts.push(gap);

  return {
    title,
    detail: parts.join(" · ") || signalDetail(signal) || "",
    gap,
  };
}
