/**
 * Pass 30R2 / P31-PATCH-01 / WHO-FAST-PATH-01
 *
 * Laws:
 *   Context may earn a person's presence as an option.
 *   Context never earns the user's selection.
 *   SELECTING ONE PERSON MUST NEVER SILENTLY RESOLVE TO A MULTI-PARTY CONVERSATION.
 *   Ranking may prioritize; it may not make valid relationships disappear.
 *   Jordan monopoly is forbidden — multi-person fast path.
 */

export type PresencePeer = {
  id: string;
  display_name: string;
  handle?: string;
};

export type PresenceChat = {
  id: string;
  name: string;
  composition?: string;
  memberCount?: number;
  peers?: PresencePeer[];
};

export type NamedPresenceCandidate = {
  /** Peer user id (person identity) — not a group conversation id */
  id: string;
  /** First name or short display for "With Maya" / "Maya" */
  displayName: string;
  /** Direct dyad conversation id only */
  conversationId: string;
  peerUserId: string;
};

export type DirectPersonOption = {
  kind: "person";
  peerUserId: string;
  displayName: string;
  /** Existing dyad conversation if known */
  conversationId: string | null;
};

export type ExplicitGroupOption = {
  kind: "group";
  conversationId: string;
  displayName: string;
  memberCount: number;
};

export type MomentWhoOption = DirectPersonOption | ExplicitGroupOption;

/** Initial WHO sheet: enough for one-tap, not every connection. */
export const WHO_FAST_PATH_CAP = 5;

export type WhoFastPathResult = {
  /** High-signal direct people on first sheet (capped) */
  fastPath: DirectPersonOption[];
  /** Eligible direct people not on first sheet — More people */
  remainingPeople: DirectPersonOption[];
  /** Explicit multi-party only */
  groups: ExplicitGroupOption[];
  hasMorePeople: boolean;
  hasGroups: boolean;
};

function firstName(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return t;
  return t.split(/\s+/)[0] || t;
}

/**
 * Multi-party / group conversation — never a single-person destination.
 * Uses composition, member count, and peer cardinality — not title tokens alone.
 */
export function isMultiPartyConversation(c: PresenceChat): boolean {
  if (!c) return true;
  if (c.composition === "group") return true;
  if ((c.memberCount ?? 0) >= 3) return true;
  if ((c.peers?.length ?? 0) > 1) return true;
  // Title lists multiple people without authoritative single peer
  if ((c.name || "").includes(",") && (c.peers?.length ?? 0) !== 1) return true;
  return false;
}

/** True when this chat can host a direct one-person invite. */
export function isDirectDyadConversation(c: PresenceChat): boolean {
  if (!c?.id) return false;
  if (isMultiPartyConversation(c)) return false;
  if (c.composition === "dyad") return true;
  // memberCount 2 (self+peer) or missing with single peer
  if ((c.memberCount ?? 2) === 2 && (c.peers?.length ?? 1) <= 1) return true;
  if ((c.memberCount ?? 0) === 0 && (c.peers?.length ?? 0) === 1) return true;
  // Legacy thin chat: single token name, not multi-party signals
  if (!c.peers?.length && !(c.name || "").includes(",") && (c.memberCount ?? 2) < 3) {
    return true;
  }
  return false;
}

/**
 * Resolve direct dyad for a known peer user id.
 * Never returns a group conversation id.
 */
export function resolveDirectConversationForPerson(
  chats: PresenceChat[],
  peerUserId: string,
): NamedPresenceCandidate | null {
  if (!peerUserId || !chats?.length) return null;

  for (const c of chats) {
    if (!isDirectDyadConversation(c)) continue;
    const peer = (c.peers || []).find((p) => p.id === peerUserId);
    if (peer) {
      return {
        id: peer.id,
        peerUserId: peer.id,
        displayName: firstName(peer.display_name) || firstName(c.name) || "Friend",
        conversationId: c.id,
      };
    }
  }
  return null;
}

/**
 * List selectable people from dyad conversations only (by peer identity).
 * Groups are excluded from person list.
 * Order preserves conversation list order (typically recency from API).
 */
export function listDirectPeopleFromChats(chats: PresenceChat[]): DirectPersonOption[] {
  const byPeer = new Map<string, DirectPersonOption>();
  const order: string[] = [];

  for (const c of chats || []) {
    if (!isDirectDyadConversation(c)) continue;
    const peer = c.peers?.[0];
    if (peer?.id) {
      if (!byPeer.has(peer.id)) {
        byPeer.set(peer.id, {
          kind: "person",
          peerUserId: peer.id,
          displayName: firstName(peer.display_name) || firstName(c.name) || "Friend",
          conversationId: c.id,
        });
        order.push(peer.id);
      }
      continue;
    }
    // Thin dyad without peers: use chat id as provisional key only when not multi-party
    if (!isMultiPartyConversation(c) && c.id) {
      const key = `chat:${c.id}`;
      if (!byPeer.has(key)) {
        byPeer.set(key, {
          kind: "person",
          peerUserId: c.id,
          displayName: firstName(c.name) || "Friend",
          conversationId: c.id,
        });
        order.push(key);
      }
    }
  }

  return order.map((id) => byPeer.get(id)!).filter(Boolean);
}

/**
 * If two people share the same first-name label, use fuller display for clarity.
 * Smallest disambiguation — no scores, no private metadata.
 */
export function disambiguatePersonLabels(people: DirectPersonOption[]): DirectPersonOption[] {
  const firstCounts = new Map<string, number>();
  for (const p of people) {
    const k = p.displayName.toLowerCase();
    firstCounts.set(k, (firstCounts.get(k) || 0) + 1);
  }
  // Only first names collide among options — leave as-is; fuller names need peer source.
  // listDirectPeopleFromChats already uses firstName; re-walk chats not available here.
  // Return unchanged when no collision; callers pass full names if they rebuild.
  void firstCounts;
  return people;
}

/**
 * Enrich labels when first names collide using peer full display_name from chats.
 */
export function withDisambiguatedNames(
  people: DirectPersonOption[],
  chats: PresenceChat[],
): DirectPersonOption[] {
  const firstCounts = new Map<string, number>();
  for (const p of people) {
    const k = p.displayName.toLowerCase();
    firstCounts.set(k, (firstCounts.get(k) || 0) + 1);
  }
  return people.map((p) => {
    if ((firstCounts.get(p.displayName.toLowerCase()) || 0) <= 1) return p;
    for (const c of chats || []) {
      if (!isDirectDyadConversation(c)) continue;
      const peer = (c.peers || []).find((x) => x.id === p.peerUserId);
      if (peer?.display_name?.trim()) {
        const full = peer.display_name.trim();
        // Prefer "Maya C." style if multi-token, else full
        const parts = full.split(/\s+/);
        if (parts.length >= 2) {
          return {
            ...p,
            displayName: `${parts[0]} ${parts[1][0]}.`,
          };
        }
        return { ...p, displayName: full };
      }
    }
    return p;
  });
}

/** Explicit groups for intentional group planning (not person masquerade). */
export function listExplicitGroupsFromChats(chats: PresenceChat[]): ExplicitGroupOption[] {
  return (chats || [])
    .filter((c) => isMultiPartyConversation(c))
    .map((c) => ({
      kind: "group" as const,
      conversationId: c.id,
      displayName: c.name || "Group",
      memberCount: c.memberCount ?? c.peers?.length ?? 3,
    }));
}

/**
 * WHO-FAST-PATH-01: high-signal direct people on first sheet; rest via More people.
 * No Jordan monopoly. Cap limits visibility, not reachability.
 */
export function buildWhoFastPath(
  chats: PresenceChat[],
  cap: number = WHO_FAST_PATH_CAP,
): WhoFastPathResult {
  const allPeople = withDisambiguatedNames(listDirectPeopleFromChats(chats), chats);
  const groups = listExplicitGroupsFromChats(chats);
  const n = Math.max(0, Math.min(cap, allPeople.length));
  const fastPath = allPeople.slice(0, n);
  const remainingPeople = allPeople.slice(n);
  return {
    fastPath,
    remainingPeople,
    groups,
    hasMorePeople: remainingPeople.length > 0,
    hasGroups: groups.length > 0,
  };
}

/**
 * @deprecated Prefer buildWhoFastPath — single-slot Jordan monopoly removed.
 * Kept for callers that need one candidate: first fast-path person (list order), never group.
 */
export function earnedNamedPresence(chats: PresenceChat[]): NamedPresenceCandidate | null {
  const { fastPath } = buildWhoFastPath(chats);
  const pick = fastPath[0];
  if (!pick?.conversationId) return null;
  return {
    id: pick.peerUserId,
    peerUserId: pick.peerUserId,
    displayName: pick.displayName,
    conversationId: pick.conversationId,
  };
}

/**
 * Hard gate: selected destination for a one-person invite must not be multi-party.
 */
export function assertDirectInviteDestination(
  chats: PresenceChat[],
  conversationId: string | null | undefined,
): { ok: true; conversationId: string } | { ok: false; reason: string } {
  if (!conversationId) return { ok: false, reason: "missing_conversation" };
  const c = (chats || []).find((x) => x.id === conversationId);
  if (!c) {
    // Unknown id may be freshly ensured dyad not yet in list
    return { ok: true, conversationId };
  }
  if (isMultiPartyConversation(c)) {
    return { ok: false, reason: "shared_group_must_not_widen_dyadic_invitation" };
  }
  if (!isDirectDyadConversation(c)) {
    return { ok: false, reason: "not_direct_dyad" };
  }
  return { ok: true, conversationId };
}

/**
 * T1-A / context contract: when WHO is already grounded, skip generic WHO sheet.
 * WHO-FAST-PATH-01 documents this; callers use it before opening fork.
 */
export type GroundedWhoContext =
  | { kind: "open" }
  | { kind: "solo" }
  | { kind: "person"; peerUserId: string; displayName: string; conversationId: string }
  | { kind: "group"; conversationId: string; displayName: string };

export function shouldShowWhoSheet(ctx: GroundedWhoContext): boolean {
  return ctx.kind === "open";
}
