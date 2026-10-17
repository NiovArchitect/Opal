/**
 * Person/Call → Chat must open a specific thread by ID authority.
 * Never: Message → fuzzy display-name match → generic Chats home.
 *
 * Ladder:
 * 1. Explicit conversationId (caller-owned) — real backend ids only
 * 2. peerUserId → existing direct dyad
 * 3. Exact display-name dyad match (last resort; no substring fuzzy)
 * 4. ensure via peerUserId (caller) OR new-chat intent for that person
 *
 * Repair #17 — the scripted seed layer is dead. This resolver NEVER returns
 * a `seed-chat-*` id: seed/demo content is backend DATA (real accounts,
 * real conversations), so a person always resolves to a real conversation
 * or to the caller's ensure/new-chat path. An explicit `seed-chat-*` id
 * passed by a legacy fixture row is treated as absent and resolution falls
 * through to the peer/name rungs — it can never drop the user into a
 * scripted parallel universe.
 */
import { isFounderSeedChatId } from "./founderChatsPlanPills";
import {
  listDirectPeopleFromChats,
  resolveDirectConversationForPerson,
  type PresenceChat,
} from "./momentNamedPresence";

export type PersonChatTarget = {
  /** Primary when known — Call Continuity / profile / live row. */
  conversationId?: string | null;
  /** Peer user id when known — ensure/create path. */
  peerUserId?: string | null;
  /** Display name for exact dyad match + New Chat label only. */
  displayName?: string | null;
};

export type PersonChatResolveOk = {
  ok: true;
  conversationId: string;
  via: "conversation_id" | "peer_user_id" | "exact_name_dyad";
};

export type PersonChatResolveNew = {
  ok: false;
  reason: "new_chat";
  displayName: string;
  peerUserId?: string | null;
};

export type PersonChatResolveEmpty = {
  ok: false;
  reason: "empty";
};

export type PersonChatResolveResult =
  | PersonChatResolveOk
  | PersonChatResolveNew
  | PersonChatResolveEmpty;

function normExact(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function isDirectish(c: PresenceChat): boolean {
  if (c.composition === "group" || (c.memberCount ?? 0) >= 3) return false;
  return true;
}

/**
 * Resolve which conversation to open for a person target.
 * Pure — does not call ensureDirectConversation (async stays in app layer).
 * The returned conversationId is always a real backend conversation id.
 */
export function resolvePersonChatTarget(
  target: PersonChatTarget,
  chats: PresenceChat[],
): PersonChatResolveResult {
  const displayName = (target.displayName || "").trim();
  const rawConversationId = (target.conversationId || "").trim();
  // Repair #17: a seed-chat-* id is not a conversation. Ignore it and let
  // the real rungs (peer dyad / exact-name dyad / new-chat ensure) decide.
  const conversationId = isFounderSeedChatId(rawConversationId)
    ? ""
    : rawConversationId;
  const peerUserId = (target.peerUserId || "").trim();

  if (!conversationId && !peerUserId && !displayName) {
    return { ok: false, reason: "empty" };
  }

  // 1) Explicit real conversation id wins.
  if (conversationId) {
    return { ok: true, conversationId, via: "conversation_id" };
  }

  // 2) Peer user id → existing direct dyad.
  if (peerUserId) {
    const resolved = resolveDirectConversationForPerson(chats, peerUserId);
    if (resolved?.conversationId) {
      return {
        ok: true,
        conversationId: resolved.conversationId,
        via: "peer_user_id",
      };
    }
    const fromList = listDirectPeopleFromChats(chats).find(
      (p) => p.peerUserId === peerUserId,
    );
    if (fromList?.conversationId) {
      return {
        ok: true,
        conversationId: fromList.conversationId,
        via: "peer_user_id",
      };
    }
    // Ensure path is async — signal New Chat with peer id so caller can ensure.
    return {
      ok: false,
      reason: "new_chat",
      displayName: displayName || "Friend",
      peerUserId,
    };
  }

  // 3) Exact display-name dyad only (no substring fuzzy).
  if (displayName) {
    const needle = normExact(displayName);
    const exact = chats.find((c) => {
      if (!isDirectish(c)) return false;
      if (isFounderSeedChatId(c.id)) return false;
      if (normExact(c.name) === needle) return true;
      const peerName = c.peers?.[0]?.display_name;
      return peerName ? normExact(peerName) === needle : false;
    });
    if (exact) {
      return { ok: true, conversationId: exact.id, via: "exact_name_dyad" };
    }
  }

  // 4) Never land on bare Chats home — New Chat intent for this person.
  if (displayName || peerUserId) {
    return {
      ok: false,
      reason: "new_chat",
      displayName: displayName || "Friend",
      peerUserId: peerUserId || null,
    };
  }

  return { ok: false, reason: "empty" };
}
