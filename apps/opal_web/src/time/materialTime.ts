/**
 * Client-side Opal time silence gate (mirrors Elixir MaterialTime).
 * Never invent times — only classify shared-safe payloads.
 */

export type MaterialKind =
  | "leave_by"
  | "availability_overlap"
  | "shared_now"
  | "significant_change";

export type MaterialResult =
  | { silence: true; reason: string }
  | { silence: false; kind: MaterialKind; summary: string; urgency?: string };

export function evaluateMaterialMoment(
  candidate: Record<string, unknown>,
  opts?: { alreadyShown?: boolean; alreadyNotified?: boolean; nowMs?: number },
): MaterialResult {
  const kind = String(candidate.kind || candidate.type || "unknown");
  const already = opts?.alreadyShown === true || opts?.alreadyNotified === true;

  if (already) return { silence: true, reason: "already_shown" };

  if (kind === "leave_by") {
    const leaveBy = parseIso(candidate.leave_by || candidate.scheduled_for);
    if (!leaveBy) return { silence: true, reason: "no_leave_by" };
    const now = opts?.nowMs ?? Date.now();
    const secs = (leaveBy.getTime() - now) / 1000;
    if (secs > 15 * 60) return { silence: true, reason: "too_early" };
    const overdue = secs < 0;
    return {
      silence: false,
      kind: "leave_by",
      summary: String(candidate.content_summary || candidate.private_copy || "Time to leave"),
      urgency: overdue ? "overdue" : "due_soon",
    };
  }

  if (kind === "availability_overlap") {
    const start = candidate.strongest_common_start || candidate.start;
    if (!start) return { silence: true, reason: "no_common_start" };
    if (candidate.shared_safe === false) return { silence: true, reason: "not_shared_safe" };
    return {
      silence: false,
      kind: "availability_overlap",
      summary: String(candidate.window_note || "A time that works for both of you"),
    };
  }

  if (kind === "shared_now") {
    const window = candidate.shared_window_start || candidate.strongest_common_start;
    if (!window) return { silence: true, reason: "no_shared_window" };
    if (candidate.participant_roster_exposed === true) {
      return { silence: true, reason: "roster_forbidden" };
    }
    return {
      silence: false,
      kind: "shared_now",
      summary: "You're free in the same window",
    };
  }

  if (kind === "significant_change") {
    if (candidate.user_value_changed !== true && candidate.significant !== true) {
      return { silence: true, reason: "no_user_value_change" };
    }
    return {
      silence: false,
      kind: "significant_change",
      summary: String(candidate.content_summary || "Your plan changed"),
    };
  }

  return { silence: true, reason: "unknown_kind" };
}

function parseIso(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
