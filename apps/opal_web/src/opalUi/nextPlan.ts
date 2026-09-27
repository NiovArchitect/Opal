/**
 * Settled plans leave the message plane. The header strip reads the current
 * SharedPlan. The history line is the frozen plan_set_event, never the live lines.
 */

export type PlanView = {
  commitment?: string | null;
  change_quiet?: boolean;
  plan_lines?: string[] | null;
  change_proposal?: { value?: string | null } | null;
  plan_set_event?: { summary?: string | null; at?: string | null } | null;
};

export type ParticipantMode = "solo" | "dyad" | "group";

export type ThreadItem<T> =
  | { kind: "message"; message: T }
  | { kind: "plan-set"; summary: string; at?: string };

export function isSettledPlan(plan: PlanView | null | undefined): boolean {
  if (!plan?.change_quiet || !plan.plan_lines?.length) return false;
  return plan.commitment === "aligned" || plan.commitment === "execution_ready";
}

export function nextPlanKicker(mode: ParticipantMode, summary: string): string {
  if (/\btonight\b/i.test(summary)) return "TONIGHT";
  if (mode === "solo") return "NEXT";
  return "NEXT TOGETHER";
}

export function nextPlanSummary(lines: string[] | null | undefined): string {
  return (lines || []).map((line) => line.trim()).filter(Boolean).join(" · ");
}

/** One current plan. moreCount stays 0 until a conversation holds several lineages. */
export function selectHeaderPlan(lines: string[] | null | undefined): {
  summary: string;
  moreCount: number;
} | null {
  const summary = nextPlanSummary(lines);
  if (!summary) return null;
  return { summary, moreCount: 0 };
}

export function planHistory(plan: PlanView | null | undefined): { summary: string; at?: string } | null {
  const summary = plan?.plan_set_event?.summary?.trim();
  if (!summary) return null;
  return {
    summary,
    at: plan?.plan_set_event?.at || undefined,
  };
}

export function interleavePlanHistory<T extends { createdAt?: string }>(
  messages: T[],
  event: { summary: string; at?: string } | null,
): ThreadItem<T>[] {
  if (!event) return messages.map((message) => ({ kind: "message", message }));
  const at = event.at ? Date.parse(event.at) : NaN;
  const items: ThreadItem<T>[] = [];
  let placed = false;
  for (const message of messages) {
    const created = message.createdAt ? Date.parse(message.createdAt) : NaN;
    if (!placed && !Number.isNaN(at) && !Number.isNaN(created) && created > at) {
      items.push({ kind: "plan-set", summary: event.summary, at: event.at });
      placed = true;
    }
    items.push({ kind: "message", message });
  }
  if (!placed) items.push({ kind: "plan-set", summary: event.summary, at: event.at });
  return items;
}
