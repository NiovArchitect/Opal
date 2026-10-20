/**
 * Repair #19 W14 - OPAL-CHAT STRUCTURE + THE THREAD DOORWAY, plus
 * Scope Addition A: person-scoped Opal chats, quick-draw both ways.
 *
 * SEPARATION LAW (one conversation type per surface):
 * - A person thread (ThreadShell) renders ONLY person + system
 *   messages. An Opal-authored message can never render there.
 * - The Opal conversation (CenterChat) renders ONLY the viewer's own
 *   messages + Opal's replies. A system line can never render there.
 * The guards below are the enforcement: MessageFlow in C1Surfaces
 * filters through them per surface, the hosts' adapters are the only
 * producers of each surface's messages, and the tests in
 * opalChatDoorway.test.tsx fail if a blended message ever paints.
 *
 * CONTEXT LAW (one context, carried - never re-derived):
 * An Opal conversation may be SCOPED to a person, optionally to one
 * plan shared with that person and to the person-thread conversation
 * it came from. The scope is a reference (ids) plus the finished
 * display names the host read from the thread's own projections at
 * doorway time; the backend stores the ids on the Opal session row
 * (Repair #19 backend scope columns) and returns them on the session
 * contract, so a reopened scoped chat still knows what "this" is.
 * A context's plan id ALWAYS comes from the thread's own DIR-1
 * next_plan fact - never from a reveal or any other plan - so a
 * doorway in thread A can never scope to thread B's plan.
 */
import type { NextPlanFact, RevealItem } from "../../api/productClient";
import type { ThreadMsg } from "./C1Surfaces";

/* ---------------- Separation guards ---------------- */

export type ConversationSurface = "person-thread" | "opal-chat";

const ALLOWED_KINDS: Record<ConversationSurface, ReadonlySet<ThreadMsg["authorKind"]>> = {
  // Person threads contain only the people + graph/system records
  // that belong there (call lines are system records of the thread's
  // own calls). Opal is not a participant in a person thread.
  "person-thread": new Set(["person", "system"]),
  // The Opal conversation is the viewer's own messages + Opal's
  // replies. Nothing else lives there.
  "opal-chat": new Set(["person", "opal"]),
};

/** True when a message kind may render on this surface at all. */
export function messageAllowedOnSurface(
  surface: ConversationSurface,
  kind: ThreadMsg["authorKind"],
): boolean {
  return ALLOWED_KINDS[surface].has(kind);
}

/**
 * The component-level enforcement: given a surface's messages, only
 * the kinds that belong to that surface survive. A blended message
 * (an Opal reply handed to a person thread, a system line handed to
 * the Opal conversation) renders NOTHING - not dimmed, not relabeled.
 */
export function messagesForSurface(
  surface: ConversationSurface,
  messages: ThreadMsg[],
): ThreadMsg[] {
  return messages.filter((m) => messageAllowedOnSurface(surface, m.authorKind));
}

/* ---------------- The scoped context ---------------- */

/**
 * The working context of a scoped Opal conversation. Ids are the
 * truth; names/titles are the finished display strings the host read
 * from the thread's own contract at doorway time (the backend
 * re-derives them live on the session contract when it can).
 */
export type OpalConversationContext = {
  personId: string;
  personName: string;
  /** The person-thread conversation this context came from. */
  conversationId?: string | null;
  planId?: string | null;
  planTitle?: string | null;
};

/** A request to land in the Opal conversation (host/shell routing). */
export type OpalOpenRequest = {
  /** The person context, when one exists. A GROUP orbit request
   *  carries none — its scope is the orbit payload below. */
  context?: OpalConversationContext | null;
  /** Open exactly this scoped session (from the person index). */
  sessionId?: string | null;
  /** Start a NEW scoped session (doorway / index "start new"). */
  startNew?: boolean;
  /**
   * Repair #20 (F-19) — the ORBIT landing: when a doorway request
   * carries an orbit scope, the Opal conversation opens INSIDE the
   * orbit screen (the ring + the arc around the scoped chat), not
   * as a bare chat column. The scope is built by the thread host
   * from the thread's own projections at doorway time; the orbit
   * host re-reads the orbit projection live on landing.
   */
  orbit?: OrbitScope | null;
};

/* ---------------- The orbit scope (Repair #20 F-19) ---------------- */

/**
 * One person on the orbit ring, from the backend orbit projection
 * (OrbitProjectionContract parties): identity (name + entity tint)
 * and their ONE pending/limbo read across the thread's plans —
 * finished facts, rendered by the ring as-is.
 */
export type OrbitPartyMember = {
  id: string;
  name: string;
  tint?: number | null;
  isViewer: boolean;
  pending: boolean;
  limbo: boolean;
  limboFractionRemaining?: number | null;
};

/**
 * The orbit scope of one thread: the anchor the orbit screen opens
 * for. For a dyad the anchor is the person (personId/personName set,
 * mirroring the doorway context); for a GROUP thread the anchor is
 * the full party set of the conversation itself (personId null —
 * no single person scopes a group honestly) and scoped sessions
 * are born conversation-scoped on the backend.
 */
export type OrbitScope = {
  conversationId: string;
  /** The thread's own title, from its conversation summary. */
  title: string;
  composition: "group" | "dyad" | string;
  party: OrbitPartyMember[];
  personId?: string | null;
  personName?: string | null;
  planId?: string | null;
  planTitle?: string | null;
};

/** The doorway context a scope carries for the person-scoped paths
 *  (chip, index, split) — a group scope has none, honestly. */
export function orbitScopePersonContext(scope: OrbitScope): OpalConversationContext | null {
  if (!scope.personId || !scope.personName) return null;
  return {
    personId: scope.personId,
    personName: scope.personName,
    conversationId: scope.conversationId,
    planId: scope.planId ?? null,
    planTitle: scope.planTitle ?? null,
  };
}

/**
 * Every session in one conversation's orbit: scoped to that
 * conversation at birth (context conversation id equality), or
 * anchored to the conversation anchor itself. Exact-id equality,
 * the same discipline as the person index — a session scoped to
 * conversation X can never appear in conversation Y's orbit.
 */
export function sessionsForConversation<T extends PersonOpalSessionRow>(
  sessions: T[],
  conversationId: string,
): T[] {
  return sessions.filter((s) => {
    if (s.context?.conversationId === conversationId) return true;
    if (s.conversationScopeId && s.conversationScopeId === conversationId) return true;
    const own = anchorOfSession(s);
    return !!own && own.type === "conversation" && own.id === conversationId;
  });
}

/* ---------------- The doorway presence rules ---------------- */

/**
 * DIR-1/DIR-4 are the single-source projections; this reads ONLY
 * them. A doorway is discussable when the thread's own shared plan
 * fact says one of:
 * - state "action": the viewer's own answer is pending on the plan
 *   (DIR-1's state derivation: viewer's canonical participant
 *   response pending) - an action pending;
 * - state "forming" with an open question: a slot of the plan is
 *   still unset on the fact itself (no when_label or no
 *   where_label), or DIR-4's derivation named the missing slot for
 *   THIS plan (a P3 item whose plan_id is the fact's plan_id);
 * - a reveal is LIT for THIS plan (DIR-4's one lit item, matched by
 *   plan_id - a lit reveal for any other plan earns nothing here).
 * Ready / happening plans with nothing pending earn no doorway:
 * honest absence, not a dead button.
 */
export function planIsDiscussable(
  fact: NextPlanFact | null | undefined,
  reveals?: RevealItem[] | null,
): boolean {
  if (!fact) return false;
  if (fact.state === "action") return true;
  const forThisPlan = (reveals ?? []).filter((r) => r.plan_id === fact.plan_id);
  if (forThisPlan.some((r) => r.lit)) return true;
  if (fact.state === "forming") {
    const openSlot = !fact.when_label?.trim() || !fact.where_label?.trim();
    if (openSlot) return true;
    if (forThisPlan.some((r) => r.category === "P3" && !!r.missing_slot)) return true;
  }
  return false;
}

/**
 * The plan doorway's context, or null when no doorway may render.
 * The context's plan id/title come ONLY from the thread's own fact;
 * the person/conversation come ONLY from the thread being viewed.
 */
export function opalDoorwayContext(input: {
  fact: NextPlanFact | null | undefined;
  reveals?: RevealItem[] | null;
  personId?: string | null;
  personName?: string | null;
  conversationId?: string | null;
}): OpalConversationContext | null {
  if (!planIsDiscussable(input.fact, input.reveals)) return null;
  const fact = input.fact!;
  // A doorway scopes to a PERSON: a thread whose peer is unknown
  // cannot scope honestly, so it earns no doorway.
  if (!input.personId || !input.personName) return null;
  return {
    personId: input.personId,
    personName: input.personName,
    conversationId: input.conversationId ?? fact.conversation_id ?? null,
    planId: fact.plan_id,
    planTitle: fact.title,
  };
}

/**
 * The person context (Scope Addition A): inside a person thread the
 * person is always here, so the Opal-chats index doorway exists by
 * placement/restraint rather than conditional existence. The context
 * carries the thread's own plan ONLY when the host passes the plan
 * fact explicitly (index "start new" from a plan doorway composes
 * the two; the plain person context stays plan-free).
 */
export function personOpalContext(input: {
  personId?: string | null;
  personName?: string | null;
  conversationId?: string | null;
}): OpalConversationContext | null {
  if (!input.personId || !input.personName) return null;
  return {
    personId: input.personId,
    personName: input.personName,
    conversationId: input.conversationId ?? null,
    planId: null,
    planTitle: null,
  };
}

/* ---------------- The person index projection ---------------- */

export type PersonOpalSessionRow = {
  id: string;
  title: string;
  preview: string;
  timeLabel: string;
  isActive: boolean;
  context: OpalConversationContext | null;
  /** Repair #20 (F-19): the raw conversation scope the session
   *  contract carries — set even for group-scoped sessions, whose
   *  person context is null (no single person scopes them). This
   *  is the orbit index's equality key for conversation orbits. */
  conversationScopeId?: string | null;
  anchor?: OpalAnchor | null;
  /** ISO recency stamp the host read from the contract, for orbit
   *  ordering (latest activity first; dormant orbits sink). */
  updatedAt?: string | null;
  /** Conversation chrome (Repair #19): the one pin + user-archive. */
  pinned?: boolean;
  pinnedAt?: string | null;
  userArchived?: boolean;
};

/**
 * The person-context index is a QUERY over scoped sessions, never a
 * second store: rows are the account's Opal sessions whose carried
 * context names exactly this person. A session scoped to person X
 * can never appear in person Y's index - the filter is an equality
 * on the session's own context person id, nothing looser.
 */
export function sessionsForPerson<T extends { context?: OpalConversationContext | null }>(
  sessions: T[],
  personId: string,
): T[] {
  return sessions.filter((s) => s.context?.personId === personId);
}

/* ---------------- ORBITS (Repair #19 supersession) ---------------- */

/**
 * The user-facing name for anchored conversation groups. PROVISIONAL
 * (founder review pending; he may rename) — this is the ONE constant
 * every surface reads, so a rename is a one-line change.
 */
export const ORBITS_NAME = "Orbits";

/**
 * A conversation's ONE primary anchor in the graph. Anchored
 * conversations live in that anchor's orbit; everything else a
 * conversation merely mentions is a facet (searchable, never an
 * anchor). The anchor rides the session contract from the backend's
 * scope columns — the one filing truth; surfaces never re-file.
 */
export type OpalAnchor = {
  type: "person" | "plan" | "place" | "conversation";
  id: string;
  label?: string | null;
  /** The orbit-private flag (item-9 gate seam; see CenterHost). */
  private?: boolean;
};

export function anchorKey(anchor: OpalAnchor): string {
  return `${anchor.type}:${anchor.id}`;
}

/**
 * Every session in one anchor's orbit: filed under exactly that
 * anchor (anchor equality), or — for a person anchor — scoped to
 * that person at birth. A session anchored to X never appears in
 * Y's orbit: both legs are exact-id equalities.
 */
export function sessionsForAnchor<T extends PersonOpalSessionRow>(
  sessions: T[],
  anchor: OpalAnchor,
): T[] {
  return sessions.filter((s) => {
    const own = anchorOfSession(s);
    if (own && anchorKey(own) === anchorKey(anchor)) return true;
    if (anchor.type === "person" && s.context?.personId === anchor.id) return true;
    if (anchor.type === "plan" && s.context?.planId === anchor.id) return true;
    return false;
  });
}

/** The anchor a session carries: its explicit contract anchor, else
 *  the anchor implied by its birth scope (plan first, then person). */
export function anchorOfSession(row: {
  anchor?: OpalAnchor | null;
  context?: OpalConversationContext | null;
}): OpalAnchor | null {
  if (row.anchor?.id) return row.anchor;
  if (row.context?.planId) {
    return { type: "plan", id: row.context.planId, label: row.context.planTitle ?? null };
  }
  if (row.context?.personId) {
    return { type: "person", id: row.context.personId, label: row.context.personName };
  }
  return null;
}

export type OrbitGroup<T> = {
  anchor: OpalAnchor;
  sessions: T[];
  /** The group's freshest line (its newest session's preview). */
  latestPreview: string;
  latestAt: string | null;
  private: boolean;
  /**
   * W21 (F6a): whether the privacy fact is actually KNOWN for this
   * group — at least one row carries an explicit contract anchor
   * with a boolean private flag (or the group anchor itself does).
   * A group whose rows only imply an anchor from birth scope has
   * NO privacy fact yet: `private` is false there, but surfaces
   * must not assert "Private" (or locked treatment) from an
   * unknown state — the pack's first-settle frame labeled every
   * group "Private" before the facts settled.
   */
  privateKnown: boolean;
};

export type OrbitLog<T> = {
  /** The live (active) conversation, pinned at the top, or null. */
  continuing: T | null;
  /**
   * PIN RULE (Repair #19 chrome): pinned conversations hold a
   * Pinned zone directly under Continuing, ordered by pin time
   * (newest pin first) — a pin survives recency ordering because
   * the zone precedes every orbit group and the unanchored list.
   * A pinned conversation renders ONLY in the Pinned zone (one
   * rendering, presence discipline); its anchor/filing is unchanged.
   */
  pinned: T[];
  /** Orbit groups, freshest first — dormant orbits sink. */
  groups: OrbitGroup<T>[];
  /** Free conversations with no anchor, in the contract's recency
   *  order (the sessions list is already newest-first). */
  unanchored: T[];
  /** User-archived conversations: retained, out of the log's flow,
   *  shown only in the log's own Archived section. */
  archived: T[];
};

/**
 * The Center conversation log projection: the ONE grouping of the
 * sessions contract into (continuing, orbit groups, unanchored).
 * Groups are keyed by the anchor's type+id equality — a conversation
 * anchored to X can never group under Y. `query` filters across
 * everything (titles, previews, anchor labels — the facets); groups
 * with no matching session drop out while searching.
 */
export function buildOrbitLog<T extends PersonOpalSessionRow>(
  sessions: T[],
  query = "",
): OrbitLog<T> {
  const q = query.trim().toLowerCase();
  const matches = (row: T, anchor: OpalAnchor | null) =>
    !q ||
    row.title.toLowerCase().includes(q) ||
    row.preview.toLowerCase().includes(q) ||
    (anchor?.label ?? "").toLowerCase().includes(q) ||
    (row.context?.personName ?? "").toLowerCase().includes(q) ||
    (row.context?.planTitle ?? "").toLowerCase().includes(q);

  const continuing = sessions.find((s) => s.isActive && !s.userArchived) ?? null;
  const byAnchor = new Map<string, { anchor: OpalAnchor; rows: T[] }>();
  const unanchored: T[] = [];
  const pinned: T[] = [];
  const archived: T[] = [];
  for (const row of sessions) {
    if (continuing && row.id === continuing.id) continue;
    const anchor = anchorOfSession(row);
    if (!matches(row, anchor)) continue;
    if (row.userArchived) {
      archived.push(row);
      continue;
    }
    if (row.pinned) {
      pinned.push(row);
      continue;
    }
    if (!anchor) {
      unanchored.push(row);
      continue;
    }
    const key = anchorKey(anchor);
    const group = byAnchor.get(key) ?? { anchor, rows: [] };
    group.rows.push(row);
    byAnchor.set(key, group);
  }
  pinned.sort((a, b) => (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""));
  const groups = [...byAnchor.values()]
    .map(({ anchor, rows }) => {
      // W21 (F6a): the privacy fact comes only from EXPLICIT
      // contract anchors (or the group anchor when it carries a
      // boolean). Anchors synthesized from birth scope carry no
      // private field — that is "unknown", never "private".
      const key = anchorKey(anchor);
      const explicit = rows
        .map((r) => r.anchor)
        .filter((a): a is OpalAnchor => Boolean(a) && anchorKey(a as OpalAnchor) === key);
      const privateKnown =
        explicit.length > 0 || typeof anchor.private === "boolean";
      return {
        anchor,
        sessions: rows,
        latestPreview: rows[0]?.preview ?? "",
        latestAt: rows[0]?.updatedAt ?? null,
        private:
          explicit.some((a) => a.private === true) || anchor.private === true,
        privateKnown,
      };
    })
    .sort((a, b) => (b.latestAt ?? "").localeCompare(a.latestAt ?? ""));
  return {
    continuing: continuing && matches(continuing, anchorOfSession(continuing)) ? continuing : q ? null : continuing,
    pinned,
    groups,
    unanchored,
    archived,
  };
}

/* ---------------- Anchor proposals + drift ---------------- */

/**
 * A proposed anchor, from the conversation's own server signals.
 * Proposals are OFFERS only: nothing files without the user's
 * explicit accept; redirect picks a different anchor; unanchor and
 * every accept/redirect are undoable in one tap (the host keeps the
 * previous anchor and re-issues the same write with it).
 */
export type AnchorProposal = {
  anchor: OpalAnchor;
  /** Why Opal thinks so, in plain words (the snapshot's own naming). */
  reason: string;
};

/**
 * Drift: the conversation's current detected subject differs from
 * its filed anchor — the host OFFERS a split (a new conversation in
 * the new orbit), never a silent move. Returns the proposal that
 * drifted to, or null when the subject still matches the anchor (or
 * there is nothing detected / nothing filed).
 */
export function driftProposal(
  currentAnchor: OpalAnchor | null,
  detected: AnchorProposal | null,
): AnchorProposal | null {
  if (!currentAnchor || !detected) return null;
  return anchorKey(currentAnchor) === anchorKey(detected.anchor) ? null : detected;
}
