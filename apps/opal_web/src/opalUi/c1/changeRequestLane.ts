/**
 * Polish Cluster A (P1) - the request-a-change lane's ONE render
 * gate for reveal cards.
 *
 * The presence rule itself is derived server-side, in the ONE
 * backend derivation (SocialFlow.Reveal.change_request_for/2):
 * permission (the viewer is a member of the plan's conversation,
 * there is another party to propose to, and no change is already
 * on the table) x alternatives (another party's still-open shared
 * availability window in that conversation). This module does NOT
 * re-derive any of that. It is the explicit render gate over the
 * derivation's finished object:
 *
 *   lane renders  <=>  item.change_request is a well-formed object
 *                      (non-empty plain label, a conversation id
 *                      that matches the item's own conversation,
 *                      at least one alternative window, a scope
 *                      person to scope the doorway to)
 *                      AND the host supplied a handler (no handler,
 *                      no control - the no-dead-controls law).
 *
 * Anything malformed or mismatched fails closed to null: a wrong
 * lane is worse than an absent one. When the backend's next read
 * returns change_request: null (the alternative window closed, a
 * proposal landed, the plan left the conversation), the action
 * disappears with it - presence is state-driven end to end.
 */
import type { RevealChangeRequest, RevealItem } from "../../api/productClient";

export type ChangeRequestAction = {
  /** The backend's plain label, verbatim (for example "Request a change"). */
  label: string;
  conversationId: string;
  /** How many real alternative windows the derivation found. */
  alternativeCount: number;
  scopePersonId: string;
  scopePersonName: string;
};

export function changeRequestAction(
  item: Pick<RevealItem, "change_request" | "conversation_id">,
  handlerPresent: boolean,
): ChangeRequestAction | null {
  if (!handlerPresent) return null;
  const lane: RevealChangeRequest | null | undefined = item.change_request;
  if (!lane || typeof lane !== "object") return null;
  const label = typeof lane.label === "string" ? lane.label.trim() : "";
  if (!label) return null;
  if (!lane.conversation_id || lane.conversation_id !== item.conversation_id) return null;
  if (!Array.isArray(lane.alternatives) || lane.alternatives.length === 0) return null;
  if (!lane.scope_person_id || !lane.scope_person_name) return null;
  return {
    label,
    conversationId: lane.conversation_id,
    alternativeCount: lane.alternatives.length,
    scopePersonId: lane.scope_person_id,
    scopePersonName: lane.scope_person_name,
  };
}
