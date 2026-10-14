/**
 * Person/Call → Chat must open a specific thread by ID authority.
 * Never: Message → fuzzy display-name match → generic Chats home.
 *
 * Ladder:
 * 1. Explicit conversationId (caller-owned)
 * 2. peerUserId → existing direct dyad
 * 3. Founder seed key → remapped live id or seed-chat-* id
 * 4. Exact display-name dyad match (last resort; no substring fuzzy)
 * 5. ensure via peerUserId (caller) OR new-chat intent for that person
 */
import {
  FOUNDER_CHATS_PLAN_PILL_ROWS,
  isFounderSeedChatId,
  remapFounderChatRowsToLive,
  type LiveChatMatchInput,
} from "./founderChatsPlanPills";
import {
  listDirectPeopleFromChats,
  resolveDirectConversationForPerson,
  type PresenceChat,
} from "./momentNamedPresence";
import { seedChatKeyFrom } from "./seedThreadIntelligence";

export type PersonChatTarget = {
  /** Primary when known — Call Continuity / profile / live row. */
  conversationId?: string | null;
  /** Peer user id when known — ensure/create path. */
  peerUserId?: string | null;
  /** Display name for seed key + New Chat label only. */
  displayName?: string | null;
};

export type PersonChatResolveOk = {
  ok: true;
  conversationId: string;
  via:
    | "conversation_id"
    | "peer_user_id"
    | "founder_seed"
    | "exact_name_dyad";
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
 */
export function resolvePersonChatTarget(
  target: PersonChatTarget,
  chats: PresenceChat[],
  opts?: { founderSeedEnabled?: boolean },
): PersonChatResolveResult {
  const displayName = (target.displayName || "").trim();
  const conversationId = (target.conversationId || "").trim();
  const peerUserId = (target.peerUserId || "").trim();

  if (!conversationId && !peerUserId && !displayName) {
    return { ok: false, reason: "empty" };
  }

  // 1) Explicit conversation id wins (including seed-chat-*).
  if (conversationId) {
    if (isFounderSeedChatId(conversationId) && opts?.founderSeedEnabled) {
      const live = chats.map(
        (c): LiveChatMatchInput => ({
          id: c.id,
          name: c.name,
          kind:
            c.composition === "group" || (c.memberCount ?? 0) >= 3
              ? "group"
              : "direct",
          memberCount: c.memberCount,
        }),
      );
      const remapped = remapFounderChatRowsToLive(
        FOUNDER_CHATS_PLAN_PILL_ROWS,
        live,
      );
      const seedRow = FOUNDER_CHATS_PLAN_PILL_ROWS.find(
        (r) => r.id === conversationId,
      );
      const hit = seedRow
        ? remapped.find((r) => r.name === seedRow.name)
        : remapped.find((r) => r.id === conversationId);
      if (hit?.id) {
        return {
          ok: true,
          conversationId: hit.id,
          via: isFounderSeedChatId(hit.id) ? "founder_seed" : "conversation_id",
        };
      }
      return { ok: true, conversationId, via: "founder_seed" };
    }
    // Prefer id if it exists in chats; still open if seed/local hydrate will accept it.
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

  // 3) Founder seed key from exact/prefix display name (seed on only).
  if (opts?.founderSeedEnabled && displayName) {
    const seedKey = seedChatKeyFrom({ displayName });
    if (seedKey) {
      const live = chats.map(
        (c): LiveChatMatchInput => ({
          id: c.id,
          name: c.name,
          kind:
            c.composition === "group" || (c.memberCount ?? 0) >= 3
              ? "group"
              : "direct",
          memberCount: c.memberCount,
        }),
      );
      const remapped = remapFounderChatRowsToLive(
        FOUNDER_CHATS_PLAN_PILL_ROWS,
        live,
      );
      const hit = remapped.find(
        (r) =>
          r.id === seedKey ||
          normExact(r.name) === normExact(displayName) ||
          seedChatKeyFrom({ displayName: r.name }) === seedKey,
      );
      if (hit?.id) {
        return {
          ok: true,
          conversationId: hit.id,
          via: "founder_seed",
        };
      }
      return { ok: true, conversationId: seedKey, via: "founder_seed" };
    }
  }

  // 4) Exact display-name dyad only (no substring fuzzy).
  if (displayName) {
    const needle = normExact(displayName);
    const exact = chats.find((c) => {
      if (!isDirectish(c)) return false;
      if (normExact(c.name) === needle) return true;
      const peerName = c.peers?.[0]?.display_name;
      return peerName ? normExact(peerName) === needle : false;
    });
    if (exact) {
      return { ok: true, conversationId: exact.id, via: "exact_name_dyad" };
    }
  }

  // 5) Never land on bare Chats home — New Chat intent for this person.
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

/** Stable seed conversation id for a founder Calls Continuity person row. */
export function founderSeedConversationIdForName(
  name: string | null | undefined,
): string | null {
  return seedChatKeyFrom({ displayName: name });
}
