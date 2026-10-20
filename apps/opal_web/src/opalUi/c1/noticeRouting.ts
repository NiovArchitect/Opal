/**
 * Repair #20 (F-21a) — NOTICE DEEP-LINK LANDING. Every notice the
 * etiquette / lane systems emit carries the identity of the exact
 * conversation it concerns; a tap must land the user in THAT
 * conversation — in its orbit when the notice concerns the orbit
 * (a fork awaiting an answer, a closure, the change-request lane:
 * all are states OF the thread's orbit), in the thread itself for
 * plain conversation notices — never a generic inbox landing.
 *
 * This module is the ONE routing derivation over notice payloads.
 * It reads only the payload's own carried identity
 * (conversation_id / plan_id / the lane's conversation) — it never
 * guesses from titles or recency. A payload with no trustworthy
 * identity routes NOWHERE (null): the caller keeps its default
 * landing rather than sending the user somewhere wrong.
 */
import type { RevealItem } from "../../api/productClient";

/** The etiquette signal types (backend AttentionSignal types for
 *  the non-response lifecycle): the graceful fork, the closures,
 *  and the nudge that precedes them. */
export const ETIQUETTE_SIGNAL_TYPES = new Set([
  "non_response_nudge",
  "non_response_fork",
  "non_response_closure",
]);

export type NoticeRoute =
  | { kind: "orbit"; conversationId: string; planId?: string | null }
  | { kind: "thread"; conversationId: string }
  | { kind: "plan"; planId: string };

/** An etiquette attention signal, as its contract carries it. */
export type EtiquetteSignalLike = {
  signal_type?: string | null;
  conversation_id?: string | null;
  plan_id?: string | null;
};

/**
 * Route an etiquette signal (fork / closure / nudge): these
 * concern the orbit of the exact conversation the signal names,
 * so the tap lands in that conversation's orbit, scoped to the
 * signal's plan when it carries one. A signal whose type is not
 * an etiquette type, or that names no conversation, has no route
 * here.
 */
export function routeForEtiquetteSignal(
  signal: EtiquetteSignalLike | null | undefined,
): NoticeRoute | null {
  if (!signal || !signal.signal_type) return null;
  if (!ETIQUETTE_SIGNAL_TYPES.has(signal.signal_type)) return null;
  if (!signal.conversation_id) return null;
  return {
    kind: "orbit",
    conversationId: signal.conversation_id,
    planId: signal.plan_id ?? null,
  };
}

/**
 * Route a reveal-feed notice. The request-a-change LANE is an
 * orbit notice: it routes to the lane's own conversation orbit,
 * scoped to its plan (the lane's doorway context is built from the
 * same identity by changeRequestContext). Any other reveal that
 * names a conversation lands in that exact thread; a plan-only
 * reveal lands on its plan; anything else routes nowhere.
 */
export function routeForReveal(item: RevealItem | null | undefined): NoticeRoute | null {
  if (!item) return null;
  const lane = item.change_request;
  if (lane && lane.conversation_id) {
    return {
      kind: "orbit",
      conversationId: lane.conversation_id,
      planId: item.plan_id ?? null,
    };
  }
  if (item.conversation_id) {
    return { kind: "thread", conversationId: item.conversation_id };
  }
  if (item.plan_id) return { kind: "plan", planId: item.plan_id };
  return null;
}

/**
 * Route a plan-carried etiquette notice (the fork / limbo state a
 * plan card wears, from the plan contract's etiquette projection):
 * a plan whose fork is PRESENTED (or whose limbo is live) is an
 * orbit notice for the plan's own conversation. A plan with no
 * live fork/limbo, or no conversation identity, routes nowhere —
 * the card keeps its ordinary plan landing.
 */
export function routeForPlanEtiquette(plan: {
  conversation_id?: string | null;
  etiquette?: {
    fork?: { state?: string | null } | null;
    limbo?: { state?: string | null } | null;
  } | null;
}): NoticeRoute | null {
  const etiquette = plan.etiquette;
  if (!etiquette || !plan.conversation_id) return null;
  const forkLive = etiquette.fork?.state === "presented";
  const limboLive = etiquette.limbo?.state === "limbo";
  if (!forkLive && !limboLive) return null;
  return { kind: "orbit", conversationId: plan.conversation_id };
}
