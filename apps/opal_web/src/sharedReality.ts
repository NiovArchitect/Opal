/**
 * Shared Reality UI projection helpers.
 *
 * Thin client mapping over ProductSignals / SharedRealityPresentation.
 * Does not invent plan authority — only formats and filters for REVEAL /
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
  // Plans: usable shared realities + strongly converging — not weak intention.
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
    // Proposal rows are detail satellites — never the primary list signal.
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
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  if (days > 0 && days < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
