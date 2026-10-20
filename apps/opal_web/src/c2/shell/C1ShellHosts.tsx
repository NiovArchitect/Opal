/**
 * Repair #18 integration wiring - the C1 hosts inside the C2 shell.
 *
 * This file is the seam the C1 and C2 reports both flagged: the shell
 * (C2) owns the Center REST deck and the dock destinations; C1 owns
 * the Center chat internals, the people chats list, and the thread.
 * The hosts here supply the real handlers and the real client data:
 *
 *  - Center destination: the C2 alignment deck is the rest surface.
 *    Its Talk to Opal entry (rendered only because this host supplies
 *    the handler, per the C2 honesty rule) opens C1's CenterChat on
 *    the account's ACTIVE Opal session; the chat's back lands on C1's
 *    CenterSessionList; New chat creates a real session through the
 *    product API. Sends go through postOpalSessionMessage and the
 *    surface re-renders from the returned messages.
 *  - Chats destination: C1's PeopleChatsList over the real
 *    conversations list; a row opens C1's ThreadShell over the real
 *    message list, with send wired to the real send path. The New
 *    action opens a people picker over the real connected-people
 *    list (each entry carries its conversation id). Below the list,
 *    the people/relationship surface: one B3 CheckinCircleRow per
 *    relationship type the account actually holds, sourced as
 *    relationship_set with that type as the filter.
 *
 * Mode scoping (wiring task 9): every C1 subtree mounts inside a
 * [data-design="r18"] wrapper. The wrapper carries NO data-mode of
 * its own - mode arrives from the shell's :root[data-mode], which
 * the c2Tokens compat blocks explicitly support
 * (:root[data-mode="dark"] [data-design="r18"]).
 *
 * Dock trap (wiring task 8): these hosts render ONLY inside the
 * shell route slot (a flex child of the shell column, constrained by
 * .c2s-c1-host in c2shell.css). No legacy Center surface
 * (opal-center-life-graph) is imported or mounted on this path, and
 * no element in the C1 subtree carries a layer token at or above
 * --layer-dock except TopLayer portals (sheet band and above, which
 * own the screen by law).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createConversationCall,
  createOpalChatSession,
  createScopedOpalChatSession,
  dismissReveal,
  getGraphLock,
  getOpalChatSession,
  listCalls,
  listMessages,
  listReveals,
  listOpalChatSessions,
  ensureDirectConversation,
  listPeople,
  listRelationships,
  setRelationshipType,
  patchOpalConversationTitle,
  postOpalSessionMessage,
  removeOpalChatSession,
  sendMessage,
  setGraphLock,
  setOpalChatAnchor,
  setOpalChatArchived,
  setOpalChatPinned,
  setOrbitPrivate,
  verifyOrbitLock,
  type ConversationSummary,
  type NextPlanFact,
  type OpalAnchorContract,
  type OpalChatContextContract,
  type OpalChatMessage,
  type OpalChatSessionSummary,
  type OpalPlanContract,
  type ProductCallHistory,
  type ProductMessage,
  type RevealItem,
} from "../../api/productClient";
import {
  anchorKey,
  anchorOfSession,
  driftProposal,
  opalDoorwayContext,
  personOpalContext,
  sessionsForAnchor,
  sessionsForPerson,
  type AnchorProposal,
  type OpalAnchor,
  type OpalConversationContext,
  type OpalOpenRequest,
  type PersonOpalSessionRow,
} from "../../opalUi/c1/opalChatScope";
import { OrbitSheet, type OrbitSheetPlan } from "../../opalUi/c1/OrbitSheet";
import { OrbitUnlockPrompt } from "../../opalUi/c1/OrbitUnlockPrompt";
import { ConversationShareSheet } from "../../opalUi/c1/ConversationShareSheet";
import { callHistoryLine } from "../../opalUi/callView";
import { correctVoiceNoteTranscript } from "../../api/productClient";
import { VoiceNoteControl } from "./adopt3";
import {
  CenterChat,
  CenterSessionList,
  ConversationRail,
  PeopleCallsList,
  PeopleChatsList,
  ThreadShell,
  type CenterSessionSummary,
  type OrbitGate,
  type PeopleCallSummary,
  type PeopleChatSummary,
  type ThreadMsg,
} from "../../opalUi/c1/C1Surfaces";
import type { PlanProjection } from "../../opalUi/c1/planProjection";
import { CheckinCircleRow } from "../../opalUi/CheckinCircleRow";
import {
  isCloseCircleType,
  relationshipGroupLabel,
  tieLabel,
} from "../../opalUi/relationshipTypes";
import { PersonProfileSheet } from "./PersonProfile";
import type { ConversationShareCardProjection, PersonProfileProjection } from "./projections";
import { avatarOf } from "./shellData";
import { CheckinSummaryCard } from "../../opalUi/CheckinSummary";
import { TopLayer } from "../../opalUi/TopLayer";
import { C2CenterOpening, type CenterOpeningProjection } from "./C2CenterOpening";
import { cardFromPlan, familyOfStatus, initialsOf } from "./shellData";
import { EmptyBlock } from "./bits";

/* ------------------------------------------------------------------ */
/* Adapters: finished projection strings only. A surface below this   */
/* file renders what it is given and derives nothing.                 */
/* ------------------------------------------------------------------ */

/** Finished short label for an ISO timestamp, built by the adapter. */
/**
 * Hunt-fix B-17: relationship types are internal enum values
 * (close_friend, …). The circle header shows finished words — an
 * unknown type renders NO header, never the raw slug.
 *
 * Repair #19 W24 (DL-12): the map itself now lives in ONE place
 * (opalUi/relationshipTypes) beside the singular map. This export
 * keeps the B-17 GROUP semantics for circle headers ("Close
 * friends" names a circle); person surfaces use tieLabel's
 * SINGULAR forms ("Close friend" names a person).
 */

/**
 * Harmony-0 (named glass finding ii): a conversation whose last
 * message is a call invite carries the raw signaling body
 * "call:<id>" as its preview (the backend's last-message text). The
 * legacy shell resolves that to a human label (OpalApp.tsx: a known
 * call's history label, else "Call"); the C2 host showed the raw id.
 * Truthful derivation from the conversation record itself: a call
 * preview reads "Call with <name>" from the conversation's own peer /
 * title - never the raw id, never an invented call outcome (the host
 * has no call record to quote a history label from). Any other
 * preview passes through untouched.
 */
export function conversationPreviewLabel(chat: {
  title: string;
  preview: string;
  peers?: { display_name: string }[];
}): string {
  const raw = (chat.preview ?? "").trim();
  if (!raw.startsWith("call:")) return chat.preview;
  const peerName = chat.peers?.find((peer) => peer.display_name?.trim())?.display_name?.trim();
  const name = peerName || chat.title?.trim();
  return name ? `Call with ${name}` : "Call";
}

export function relationshipTypeLabel(type: string): string | null {
  return relationshipGroupLabel(type);
}

/**
 * Deckfix F2a: a call in a conversation is stored as a message whose
 * body is the signaling reference "call:<id>" (message_type
 * "call_invite", calls.ex maybe_call_invite_message). The legacy
 * shell resolves that to the call record's own history line; the C2
 * thread host rendered the raw body as a person bubble - the full
 * pack's `call:47f28413-...` bubble. The truthful line comes from
 * the call record itself, through the SAME derivation the call log
 * renders (callHistoryLine over the server's history_label - the
 * server-side Calls.history_label). No record in the viewer's call
 * list means no outcome may be invented: the line is plain "Call",
 * and the raw id never renders either way.
 */
export function callInviteIdOf(m: {
  body?: string | null;
  message_type?: string | null;
}): string | null {
  const body = (m.body ?? "").trim();
  if (m.message_type === "call_invite" || body.startsWith("call:")) {
    const id = body.startsWith("call:") ? body.slice("call:".length).trim() : "";
    return id || null;
  }
  return null;
}

export function callLineForCallRecord(call: ProductCallHistory): string {
  return callHistoryLine({
    historyLabel: call.history_label,
    createdAt: call.created_at,
    peerName: call.peer_name,
  }).metadata;
}

export function threadMsgFromProductMessage(
  m: ProductMessage,
  ctx: {
    viewerUserId?: string;
    names: Map<string, string>;
    callLineById: ReadonlyMap<string, string>;
  },
): ThreadMsg {
  const callId = callInviteIdOf(m);
  if (callId !== null || m.message_type === "call_invite") {
    return {
      id: m.id,
      authorKind: "system",
      body: (callId ? ctx.callLineById.get(callId) : undefined) ?? "Call",
    };
  }
  return {
    id: m.id,
    authorKind: "person",
    authorName: ctx.names.get(m.sender_user_id),
    own: Boolean(ctx.viewerUserId) && m.sender_user_id === ctx.viewerUserId,
    body: m.body,
    audioUrl: m.audio_url ?? null,
    durationMs: m.duration_ms ?? null,
    messageType: m.message_type,
  };
}

export function timeLabelFor(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function viewerStateOf(
  raw: string | null | undefined,
): "going" | "interested" | "invited" | "notGoing" | null {
  switch ((raw ?? "").toLowerCase()) {
    case "going":
      return "going";
    case "interested":
      return "interested";
    case "invited":
    case "pending":
      return "invited";
    case "not_going":
    case "notgoing":
    case "declined":
      return "notGoing";
    default:
      return null;
  }
}

/**
 * Repair #19 BS-11 — the ONE conversation -> share-card adapter.
 * W13's plan-card law for a conversation: the card is built only
 * from records the host actually holds (the conversation's title,
 * its anchor, and the anchor plan's ONE projection), its text lines
 * are exactly what the card shows and what Copy places on the
 * clipboard, and it NEVER carries a URL, id, or message content —
 * a conversation has no shareable link, and its messages are
 * private to the account. The opening line states in words what
 * the recipient gets, so the artifact is honest out of context.
 */
export function conversationShareCard(input: {
  title: string;
  anchor: OpalAnchor | null;
  anchorPlan: PlanProjection | null;
}): ConversationShareCardProjection {
  const anchorLine = input.anchor?.label ? `Filed under ${input.anchor.label}` : null;
  const plan = input.anchorPlan
    ? {
        title: input.anchorPlan.title,
        stateLabel: input.anchorPlan.stateLabel,
        whenLine:
          input.anchorPlan.when.kind === "unset" ? null : input.anchorPlan.when.label,
        whereLine:
          input.anchorPlan.where.kind === "place"
            ? input.anchorPlan.where.name
            : input.anchorPlan.where.kind === "virtual"
              ? input.anchorPlan.where.label
              : null,
      }
    : null;
  const textLines = [
    `Opal chat: ${input.title}`,
    ...(anchorLine ? [anchorLine] : []),
    ...(plan
      ? [
          plan.title,
          plan.stateLabel,
          ...(plan.whenLine ? [plan.whenLine] : []),
          ...(plan.whereLine ? [plan.whereLine] : []),
        ]
      : []),
    "Shared from Opal - the conversation itself stays private to its account.",
  ];
  return { title: input.title, anchorLine, plan, textLines };
}

/**
 * The ONE plan contract -> the ONE C1 plan projection. State family
 * and label come from the shell adapter's single mapping
 * (cardFromPlan); attendance exists only when the backend counter
 * fields are present on the contract (absent = no count, ever);
 * where follows the plan's own place kind (virtual plans render the
 * virtual form, never a string comparison against a place name).
 */
export function planProjectionFromContract(plan: OpalPlanContract): PlanProjection {
  const card = cardFromPlan(plan);
  const isVirtual = plan.plan_type === "virtual" || plan.online === true;
  const hasCounts =
    typeof plan.going_count === "number" && typeof plan.total_count === "number";
  const conflictTitle =
    plan.conflict && typeof plan.conflict.title === "string" && plan.conflict.title
      ? plan.conflict.title
      : null;
  return {
    id: plan.id,
    title: plan.title,
    state: familyOfStatus(plan.status),
    stateLabel: card.stateLabel,
    primaryAction: { kind: "view", label: "View plan" },
    when: plan.time_label?.trim()
      ? { kind: "canonical", label: plan.time_label }
      : { kind: "unset" },
    where: isVirtual
      ? { kind: "virtual", label: plan.location?.trim() ? plan.location : "Online" }
      : plan.location?.trim()
        ? { kind: "place", name: plan.location }
        : { kind: "unset" },
    attendance: hasCounts
      ? {
          going: plan.going_count as number,
          interested:
            typeof plan.interested_count === "number" ? plan.interested_count : 0,
          total: plan.total_count as number,
          viewerState: viewerStateOf(plan.viewer_state),
          faces: [],
        }
      : null,
    conflict: conflictTitle
      ? { title: conflictTitle, timeLabel: plan.conflict?.time_label ?? null }
      : null,
  };
}

/** Harmony2 (adopt1 4.C1's missing leg): parse the holding answer's
 * metadata.holding ({counters, links, answer_text} - the ONE counter
 * set from GraphPeople.holding/1) into per-figure chips. Labels use
 * the answer text's own phrasing; a figure renders only when both
 * its counter and its link target are present - never invented. */
export function holdingFiguresFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ThreadMsg["holdingFigures"] {
  const holding = metadata?.holding;
  if (!holding || typeof holding !== "object") return null;
  const counters = (holding as { counters?: unknown }).counters;
  const links = (holding as { links?: unknown }).links;
  if (!counters || typeof counters !== "object" || !links || typeof links !== "object") {
    return null;
  }
  const count = (key: string): number | null => {
    const value = (counters as Record<string, unknown>)[key];
    return typeof value === "number" ? value : null;
  };
  const target = (key: string): string | null => {
    const value = (links as Record<string, unknown>)[key];
    return typeof value === "string" && value ? value : null;
  };
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const specs: Array<{ key: string; label: (n: number) => string }> = [
    {
      key: "plans_in_motion",
      label: (n) => `${n} ${plural(n, "plan", "plans")} in motion`,
    },
    { key: "approvals_waiting", label: (n) => `${n} waiting on your answer` },
    {
      key: "memories_held",
      label: (n) => `${n} ${plural(n, "memory", "memories")} held`,
    },
    {
      key: "sources_connected",
      label: (n) => `${n} ${plural(n, "source", "sources")} connected`,
    },
  ];
  const figures = specs.flatMap((spec) => {
    const n = count(spec.key);
    const t = target(spec.key);
    return n !== null && t !== null
      ? [{ key: spec.key, label: spec.label(n), target: t }]
      : [];
  });
  return figures.length > 0 ? figures : null;
}

/* ------------------------------------------------------------------ */
/* Repair #19 W14 — scoped Opal conversation adapters. The context   */
/* contract (ids + live-derived names) becomes the web context; the  */
/* person index is a filter over the sessions contract, never a      */
/* second store.                                                     */
/* ------------------------------------------------------------------ */

export function contextFromContract(
  raw: OpalChatContextContract | null | undefined,
  fallback?: Partial<OpalConversationContext> | null,
): OpalConversationContext | null {
  if (!raw?.person_id) return null;
  return {
    personId: raw.person_id,
    personName: raw.person_name?.trim() || fallback?.personName || "This person",
    conversationId: raw.conversation_id ?? fallback?.conversationId ?? null,
    planId: raw.plan_id ?? null,
    planTitle: raw.plan_title ?? fallback?.planTitle ?? null,
  };
}

export function anchorFromContract(
  raw: OpalAnchorContract | null | undefined,
): OpalAnchor | null {
  if (!raw?.id || !raw?.type) return null;
  if (raw.type !== "person" && raw.type !== "plan" && raw.type !== "place") return null;
  return { type: raw.type, id: raw.id, label: raw.label ?? null, private: raw.private === true };
}

/**
 * W21 (F6b): the orbit sheet's anchor, refreshed from the sessions
 * read-back. The sheet previously re-opened with the CALLER's stale
 * anchor object, so a successful orbit-private write never showed:
 * the toggle label and aria-pressed kept the pre-write value even
 * though the server (and the rail's group headers, which read the
 * rows) had the new truth. The read-back rows are the truth: if any
 * of this orbit's sessions carries the explicit anchor, its private
 * flag (some = private, the write is orbit-wide) wins.
 */
export function anchorWithOrbitReadBack(
  anchor: OpalAnchor,
  rows: PersonOpalSessionRow[],
): OpalAnchor {
  const key = anchorKey(anchor);
  const explicit = rows
    .map((r) => r.anchor)
    .filter((a): a is OpalAnchor => Boolean(a) && anchorKey(a as OpalAnchor) === key);
  if (explicit.length === 0) return anchor;
  return {
    ...anchor,
    label: anchor.label ?? explicit[0].label ?? null,
    private: explicit.some((a) => a.private === true),
  };
}

export function summaryToRow(s: OpalChatSessionSummary): PersonOpalSessionRow {
  return {
    id: s.id,
    title: s.title?.trim() ? s.title : "New chat",
    preview: s.last_message_preview ?? "",
    timeLabel: timeLabelFor(s.updated_at),
    isActive: s.active === true,
    context: contextFromContract(s.context),
    anchor: anchorFromContract(s.anchor),
    updatedAt: s.updated_at ?? null,
    pinned: s.pinned === true,
    pinnedAt: s.pinned_at ?? null,
    userArchived: s.user_archived === true,
  };
}

export function personIndexRowsFromSummaries(
  summaries: OpalChatSessionSummary[],
): PersonOpalSessionRow[] {
  return summaries.map(summaryToRow);
}

/**
 * Which existing session a doorway lands in: the account's own
 * session scoped to BOTH this person AND this plan (exact equality
 * on both ids — a session about the same person but a different
 * plan is a different conversation and is never reused for this
 * doorway). Null means the doorway starts a new scoped session.
 */
export function doorwayTargetSessionId(
  summaries: OpalChatSessionSummary[],
  context: OpalConversationContext,
): string | null {
  const rows = personIndexRowsFromSummaries(summaries);
  const match = sessionsForPerson(rows, context.personId).find(
    (r) => r.context?.planId && r.context.planId === context.planId,
  );
  return match?.id ?? null;
}

/** The person of a dyad conversation: its single peer. A group
 *  thread has no single person to scope to — null, honestly. */
export function dyadPersonOf(chat: {
  peers?: { id: string; display_name: string }[];
  composition?: string | null;
}): { personId: string; personName: string } | null {
  const peers = chat.peers ?? [];
  if (peers.length !== 1) return null;
  const name = peers[0].display_name?.trim();
  if (!peers[0].id || !name) return null;
  return { personId: peers[0].id, personName: name };
}

export function threadMsgFromOpalMessage(m: OpalChatMessage): ThreadMsg {
  const planId =
    m.metadata && typeof m.metadata.plan_id === "string" ? m.metadata.plan_id : null;
  return {
    id: m.id,
    authorKind: m.role === "user" ? "person" : "opal",
    own: m.role === "user",
    body: m.body,
    planId,
    holdingFigures: holdingFiguresFromMetadata(m.metadata),
  };
}

/** The check-in summary sheet shared by every circle-row mount. */
export function CheckinSummarySheet({
  sweepId,
  bearer,
  onClose,
}: {
  sweepId: string;
  bearer?: string;
  onClose: () => void;
}) {
  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" data-testid="c2-checkin-summary-sheet" onClick={onClose}>
        <div
          className="c2s-sheet"
          role="dialog"
          aria-label="Check-in summary"
          onClick={(e) => e.stopPropagation()}
        >
          <CheckinSummaryCard sweepId={sweepId} bearer={bearer} />
          <button type="button" className="c2s-btn-text" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </TopLayer>
  );
}

/* ------------------------------------------------------------------ */
/* Center destination: deck (C2 rest) + C1 session list + C1 chat.    */
/* ------------------------------------------------------------------ */

type CenterView =
  | { kind: "deck" }
  | { kind: "sessions" }
  | { kind: "chat"; sessionId: string; title: string };

export type CenterOpenRequest = { request: OpalOpenRequest; nonce: number };

/** A relationship contact, for anchor-proposal resolution. */
export type AnchorContact = {
  contact_user_id: string;
  display_name: string;
  /** W24 (DL-03): the finished tie, from the contacts contract. */
  tieLabel?: string | null;
};

/**
 * Repair #19 Orbits — anchor DETECTION for the proposal chip, from
 * the conversation's own server signals only: the latest Opal
 * message's context_snapshot names a person (who / primary_person,
 * stamped by the Center pipeline), and that name resolves UNIQUEly
 * to one of the account's relationship contacts. Fail-closed: no
 * unique resolution, no proposal — a wrong filing is worse than
 * none, so this never guesses.
 */
export function anchorProposalFromMessages(
  rawMessages: OpalChatMessage[],
  contacts: AnchorContact[],
): AnchorProposal | null {
  for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
    const m = rawMessages[i];
    if (m.role !== "opal") continue;
    const snap = m.metadata?.context_snapshot as Record<string, unknown> | undefined;
    if (!snap) continue;
    const who = [snap.who, snap.primary_person].find(
      (v): v is string => typeof v === "string" && v.trim() !== "" && v !== "__clear__",
    );
    if (!who) continue;
    const wanted = who.trim().toLowerCase();
    const exact = contacts.filter((c) => c.display_name.trim().toLowerCase() === wanted);
    const byFirst = contacts.filter(
      (c) => c.display_name.trim().toLowerCase().split(/\s+/)[0] === wanted,
    );
    const match = exact.length === 1 ? exact[0] : byFirst.length === 1 ? byFirst[0] : null;
    if (!match) return null;
    return {
      anchor: { type: "person", id: match.contact_user_id, label: match.display_name.trim() },
      reason: "snapshot",
    };
  }
  return null;
}

export function CenterHost({
  bearer,
  opening,
  openingEvents,
  plans,
  onOpenGraph,
  onHoldingLink,
  openRequest,
  onOpenPersonThread,
}: {
  bearer?: string;
  opening: CenterOpeningProjection;
  openingEvents: {
    openGraph: (cardId: string) => void;
    makeSomethingHappen: () => void;
    completeSlot: (cardId: string, slotKind: string) => void;
    /** SM doorway, first form - passed through to the opening. */
    openSoulMemory?: () => void;
  };
  plans: OpalPlanContract[];
  onOpenGraph: (cardId: string) => void;
  /** Harmony2: a holding chip tap routes to its named surface. */
  onHoldingLink?: (target: string) => void;
  /** Repair #19 — a doorway/index request routed from a person thread. */
  openRequest?: CenterOpenRequest | null;
  /** Repair #19 — quick-draw back into a person thread (shell routes it). */
  onOpenPersonThread?: (conversationId: string) => void;
}) {
  const [view, setView] = useState<CenterView>({ kind: "deck" });
  const [sessions, setSessions] = useState<PersonOpalSessionRow[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionsLoaded = useRef(false);
  // DIR-4: the deck's reveal items, from the ONE derivation.
  const [reveals, setReveals] = useState<RevealItem[]>([]);
  // Repair #19 state: the open chat's carried scope/anchor/chrome,
  // the raw messages (proposal detection reads their metadata), the
  // account's contacts (proposal resolution), and the orbit sheet.
  const [rawMessages, setRawMessages] = useState<OpalChatMessage[]>([]);
  const [chatContext, setChatContext] = useState<OpalConversationContext | null>(null);
  const [chatAnchor, setChatAnchor] = useState<OpalAnchor | null>(null);
  const [chatPinned, setChatPinned] = useState(false);
  const [contacts, setContacts] = useState<AnchorContact[]>([]);
  const [anchorNotice, setAnchorNotice] = useState<{ text: string; prev: OpalAnchor | null } | null>(null);
  const [splitDismissedKey, setSplitDismissedKey] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [orbitSheet, setOrbitSheet] = useState<{
    anchor: OpalAnchor;
    context: OpalConversationContext | null;
    sessions: PersonOpalSessionRow[];
    plans: OrbitSheetPlan[];
  } | null>(null);
  const [unlockedOrbits, setUnlockedOrbits] = useState<ReadonlySet<string>>(new Set());
  // Repair #19 BS-02 — the orbit gate's verification state: which
  // locked orbit (if any) has its passcode prompt open, and whether
  // the account has a passcode at all (W7's one lock truth, read via
  // getGraphLock; null = not yet known). Unlocks live only in this
  // host's memory and relock exactly as the Graphs Private area
  // does: app to background, or this host unmounting.
  const [orbitPromptKey, setOrbitPromptKey] = useState<string | null>(null);
  const [orbitPasscodeSet, setOrbitPasscodeSet] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await getGraphLock(bearer);
        if (live) setOrbitPasscodeSet(res.passcode_set === true);
      } catch {
        if (live) setOrbitPasscodeSet(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [bearer]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setUnlockedOrbits(new Set());
        setOrbitPromptKey(null);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      setUnlockedOrbits(new Set());
      setOrbitPromptKey(null);
    };
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const feed = await listReveals(bearer);
        if (live) setReveals(feed.items ?? []);
      } catch {
        if (live) setReveals([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [bearer]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await listRelationships(bearer);
        if (!live) return;
        const list = (res.contacts ?? [])
          .filter(
            (c) =>
              !!c &&
              typeof c.contact_user_id === "string" &&
              typeof c.display_name === "string",
          )
          .map(
            (c): AnchorContact => ({
              contact_user_id: c.contact_user_id,
              display_name: c.display_name as string,
              tieLabel: tieLabel(c.type, c.family_subtype),
            }),
          );
        setContacts(list);
      } catch {
        if (live) setContacts([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [bearer]);

  const dismissDeckReveal = useCallback(
    async (item: RevealItem) => {
      try {
        const feed = await dismissReveal(item.reveal_key, bearer);
        setReveals(feed.items ?? []);
      } catch {
        // Dismissal is server truth; on failure the item stays.
      }
    },
    [bearer],
  );

  const plansById = useMemo(() => {
    const map = new Map<string, PlanProjection>();
    for (const plan of plans) map.set(plan.id, planProjectionFromContract(plan));
    return map;
  }, [plans]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await listOpalChatSessions(bearer);
      const rows = res.conversations ?? [];
      setSessions(rows.map(summaryToRow));
      const active = rows.find((s) => s.active === true) ?? rows[0];
      setActiveSessionId(active?.id ?? null);
      sessionsLoaded.current = true;
      return rows;
    } catch {
      sessionsLoaded.current = true;
      return [];
    }
  }, [bearer]);

  const applyConversation = useCallback(
    (conv: {
      id: string;
      title?: string | null;
      messages?: OpalChatMessage[];
      context?: OpalChatContextContract | null;
      anchor?: { type: string; id: string; label?: string | null; private?: boolean } | null;
      pinned?: boolean | null;
    }, fallbackTitle: string, fallbackContext?: OpalConversationContext | null) => {
      const raw = conv.messages ?? [];
      setRawMessages(raw);
      setMessages(raw.map(threadMsgFromOpalMessage));
      const ctx = contextFromContract(conv.context, fallbackContext);
      setChatContext(ctx);
      setChatAnchor(
        anchorFromContract(conv.anchor) ??
          (ctx?.planId
            ? { type: "plan", id: ctx.planId, label: ctx.planTitle ?? null }
            : ctx?.personId
              ? { type: "person", id: ctx.personId, label: ctx.personName }
              : null),
      );
      setChatPinned(conv.pinned === true);
      setAnchorNotice(null);
      setSplitDismissedKey(null);
      setView({
        kind: "chat",
        sessionId: conv.id,
        title: conv.title?.trim() ? conv.title : fallbackTitle,
      });
    },
    [],
  );

  const openChat = useCallback(
    async (sessionId: string, fallbackTitle: string, fallbackContext?: OpalConversationContext | null) => {
      setError(null);
      try {
        const res = await getOpalChatSession(sessionId, bearer);
        applyConversation(res.conversation, fallbackTitle, fallbackContext);
      } catch {
        setError("That chat could not load. Try again from the list.");
        setView({ kind: "sessions" });
      }
    },
    [bearer, applyConversation],
  );

  const createScopedAndOpen = useCallback(
    async (context: OpalConversationContext) => {
      setError(null);
      try {
        const res = await createScopedOpalChatSession(
          { personId: context.personId, planId: context.planId, conversationId: context.conversationId },
          bearer,
        );
        applyConversation(res.conversation, "New chat", context);
        void loadSessions();
      } catch {
        setError("A chat about this could not start. Check your connection and try again.");
      }
    },
    [bearer, applyConversation, loadSessions],
  );

  /** The doorway resolution: reuse the session already scoped to
   *  this person AND this plan; only start a new one when none is. */
  const openDoorway = useCallback(
    async (context: OpalConversationContext) => {
      if (!context.planId) {
        await createScopedAndOpen(context);
        return;
      }
      try {
        const rows = await loadSessions();
        const target = doorwayTargetSessionId(rows, context);
        if (target) {
          await openChat(target, context.planTitle ?? "New chat", context);
          return;
        }
      } catch {
        /* fall through to a fresh scoped session */
      }
      await createScopedAndOpen(context);
    },
    [createScopedAndOpen, loadSessions, openChat],
  );

  const lastRequestNonce = useRef(0);
  useEffect(() => {
    if (!openRequest || openRequest.nonce === lastRequestNonce.current) return;
    lastRequestNonce.current = openRequest.nonce;
    const { request } = openRequest;
    if (request.sessionId) {
      void openChat(request.sessionId, "New chat", request.context);
    } else if (request.startNew) {
      void openDoorway(request.context);
    } else {
      void openDoorway(request.context);
    }
  }, [openRequest, openChat, openDoorway]);

  const openActiveChat = useCallback(async () => {
    const rows = sessionsLoaded.current ? null : await loadSessions();
    const targetId =
      activeSessionId ?? rows?.find((s) => s.active === true)?.id ?? rows?.[0]?.id ?? null;
    if (targetId) {
      const known = sessions.find((s) => s.id === targetId);
      await openChat(targetId, known?.title ?? "New chat");
      return;
    }
    // No session exists yet: New chat creates the first one for real.
    try {
      const res = await createOpalChatSession(bearer);
      applyConversation(res.conversation, "New chat");
      void loadSessions();
    } catch {
      setError("A new chat could not start. Check your connection and try again.");
    }
  }, [activeSessionId, bearer, loadSessions, openChat, sessions, applyConversation]);

  const newChat = useCallback(async () => {
    setError(null);
    try {
      const res = await createOpalChatSession(bearer);
      applyConversation(res.conversation, "New chat");
      void loadSessions();
    } catch {
      setError("A new chat could not start. Check your connection and try again.");
    }
  }, [bearer, loadSessions, applyConversation]);

  const send = useCallback(
    async (text: string) => {
      if (view.kind !== "chat") return;
      setError(null);
      try {
        const res = await postOpalSessionMessage(view.sessionId, text, bearer);
        const returnedRaw = res.messages ?? [];
        setRawMessages((prev) => [...prev, ...returnedRaw]);
        const returned = returnedRaw.map(threadMsgFromOpalMessage);
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...returned.filter((m) => !seen.has(m.id))];
        });
        void loadSessions();
      } catch {
        setError("That did not send. Your words were not saved - try again.");
      }
    },
    [bearer, loadSessions, view],
  );

  useEffect(() => {
    if (view.kind === "sessions") void loadSessions();
  }, [view.kind, loadSessions]);

  /* ---- Orbit sheet (shared by the log, the rail, and the chip) -- */
  const openOrbitSheet = useCallback(
    async (anchor: OpalAnchor, context: OpalConversationContext | null) => {
      try {
        const res = await listOpalChatSessions(bearer);
        const rows = (res.conversations ?? []).map(summaryToRow);
        const inOrbit = sessionsForAnchor(rows, anchor);
        const sheetPlans = new Map<string, OrbitSheetPlan>();
        if (anchor.type === "plan") {
          sheetPlans.set(anchor.id, { id: anchor.id, title: anchor.label ?? "Plan" });
        }
        for (const r of inOrbit) {
          if (r.context?.planId && r.context.planTitle) {
            sheetPlans.set(r.context.planId, { id: r.context.planId, title: r.context.planTitle });
          }
        }
        setOrbitSheet({
          anchor: anchorWithOrbitReadBack(anchor, rows),
          context,
          sessions: inOrbit,
          plans: [...sheetPlans.values()],
        });
      } catch {
        setOrbitSheet({ anchor, context, sessions: [], plans: [] });
      }
    },
    [bearer],
  );

  const refreshOrbitSheet = useCallback(() => {
    if (orbitSheet) void openOrbitSheet(orbitSheet.anchor, orbitSheet.context);
  }, [orbitSheet, openOrbitSheet]);

  /* ---- Chrome + anchor actions for the open chat ----------------- */
  const detected = useMemo(
    () => anchorProposalFromMessages(rawMessages, contacts),
    [rawMessages, contacts],
  );
  const anchorProposal = view.kind === "chat" && !chatAnchor ? detected : null;
  const drift = view.kind === "chat" ? driftProposal(chatAnchor, detected) : null;
  const splitProposal =
    drift && splitDismissedKey !== `${drift.anchor.type}:${drift.anchor.id}` ? drift : null;

  const applyAnchorWrite = useCallback(
    async (next: OpalAnchor | null, noticeText: string) => {
      if (view.kind !== "chat") return;
      const prev = chatAnchor;
      try {
        const res = await setOpalChatAnchor(view.sessionId, next, bearer);
        setChatAnchor(anchorFromContract(res.conversation.anchor) ?? next);
        const ctx = contextFromContract(res.conversation.context, chatContext);
        setChatContext(ctx);
        setAnchorNotice({ text: noticeText, prev });
        void loadSessions();
      } catch {
        setError("That filing did not save. The chat stays where it was.");
      }
    },
    [bearer, chatAnchor, chatContext, loadSessions, view],
  );

  // Repair #19 BS-11 — SHARE honesty: the overflow's Share opens the
  // conversation share sheet (W13's share-card law): a real card of
  // the conversation's details whose one action is Copy details.
  // The previous behavior — handing the platform share sheet /
  // clipboard the bare text "Opal chat: <title> (<anchor>)", a
  // reference that resolves to nothing — no longer exists anywhere
  // on this path.
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const shareCard =
    view.kind === "chat"
      ? conversationShareCard({
          title: view.title,
          anchor: chatAnchor,
          anchorPlan:
            (chatAnchor?.type === "plan" ? plansById.get(chatAnchor.id) : undefined) ??
            (chatContext?.planId ? plansById.get(chatContext.planId) : undefined) ??
            null,
        })
      : null;

  if (view.kind === "deck") {
    return (
      <>
        <C2CenterOpening
          projection={{ ...opening, reveals }}
          events={{
            ...openingEvents,
            openCenterChat: () => void openActiveChat(),
            dismissReveal: (item) => void dismissDeckReveal(item),
            revealAction: (item) => {
              if (item.plan_id) onOpenGraph(item.plan_id);
            },
          }}
        />
        {error ? (
          <p className="c2s-error-line" role="alert" style={{ padding: "0 var(--gutter)" }}>
            {error}
          </p>
        ) : null}
      </>
    );
  }

  // Repair #19 BS-02 — the orbit gate, WIRED. A locked orbit reveals
  // nothing until the account's passcode verifies server-side
  // (verifyOrbitLock, W7's one lock truth via the W19-FIX-A orbit
  // endpoint). requestUnlock only OPENS the passcode prompt; the
  // orbit joins unlockedOrbits solely in the prompt's onUnlocked,
  // which fires only on a successful verify (or a successful
  // first-time set, when no passcode existed — the Graphs Private
  // area's exact law). A wrong code keeps the orbit locked and the
  // prompt says so.
  const orbitGate: OrbitGate = {
    isUnlocked: (key) => unlockedOrbits.has(key),
    requestUnlock: (key) => {
      setOrbitPromptKey(key);
    },
  };
  const orbitPromptAnchor = orbitPromptKey
    ? (sessions
        .map((s) => anchorOfSession(s))
        .find((a) => a && anchorKey(a) === orbitPromptKey) ?? null)
    : null;

  return (
    <div data-design="r18" className="c2s-c1-host" data-testid="c2-c1-center-host">
      {view.kind === "sessions" ? (
        <>
          <div className="c2s-c1-host-bar">
            <button
              type="button"
              className="c2s-btn-text"
              data-testid="c2-c1-back-to-center"
              onClick={() => setView({ kind: "deck" })}
            >
              Back to Center
            </button>
          </div>
          <CenterSessionList
            sessions={sessions}
            orbitGate={orbitGate}
            onNewChat={() => void newChat()}
            onOpen={(id) => {
              const known = sessions.find((s) => s.id === id);
              void openChat(id, known?.title ?? "New chat");
            }}
            onOpenOrbit={(anchor, context) => void openOrbitSheet(anchor, context)}
            onUnarchive={(id) => {
              void (async () => {
                try {
                  await setOpalChatArchived(id, false, bearer);
                  void loadSessions();
                } catch {
                  setError("That chat could not be unarchived.");
                }
              })();
            }}
          />
        </>
      ) : (
        <CenterChat
          title={view.title}
          messages={messages}
          plansById={plansById}
          onBack={() => setView({ kind: "sessions" })}
          onOpenPlan={(plan) => onOpenGraph(plan.id)}
          onSend={(text) => void send(text)}
          onHoldingLink={onHoldingLink}
          context={chatContext}
          onOpenPersonThread={(ctx) => {
            if (ctx.conversationId && onOpenPersonThread) onOpenPersonThread(ctx.conversationId);
          }}
          onOpenOpalChats={(ctx) => {
            const anchor: OpalAnchor = ctx.planId
              ? { type: "plan", id: ctx.planId, label: ctx.planTitle ?? null }
              : { type: "person", id: ctx.personId, label: ctx.personName };
            void openOrbitSheet(anchor, ctx);
          }}
          chrome={{
            onOpenRail: () => setRailOpen(true),
            pinned: chatPinned,
            onRename: (title) => {
              void (async () => {
                try {
                  const res = await patchOpalConversationTitle(view.sessionId, title, bearer);
                  const updated = summaryToRow(res.conversation);
                  setView({ kind: "chat", sessionId: view.sessionId, title: updated.title });
                  setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                } catch {
                  setError("That rename did not save. The old title stands.");
                }
              })();
            },
            onTogglePin: () => {
              void (async () => {
                try {
                  const res = await setOpalChatPinned(view.sessionId, !chatPinned, bearer);
                  setChatPinned(res.conversation.pinned === true);
                  void loadSessions();
                } catch {
                  setError("That pin did not save.");
                }
              })();
            },
            onToggleArchive: () => {
              void (async () => {
                try {
                  await setOpalChatArchived(view.sessionId, true, bearer);
                  setView({ kind: "sessions" });
                  void loadSessions();
                } catch {
                  setError("That archive did not save.");
                }
              })();
            },
            onShare: () => setShareSheetOpen(true),
            onDelete: () => {
              void (async () => {
                try {
                  await removeOpalChatSession(view.sessionId, bearer);
                  setView({ kind: "sessions" });
                  void loadSessions();
                } catch {
                  setError("That delete did not happen. The chat is still here.");
                }
              })();
            },
            anchorProposal,
            onAcceptAnchor: (p) =>
              void applyAnchorWrite(p.anchor, `Filed under ${p.anchor.label ?? "that anchor"}.`),
            anchorCandidates: [
              ...contacts.map(
                (c): OpalAnchor => ({ type: "person", id: c.contact_user_id, label: c.display_name }),
              ),
              ...plans.map(
                (pl): OpalAnchor => ({ type: "plan", id: pl.id, label: pl.title }),
              ),
            ],
            onPickAnchor: (a) =>
              void applyAnchorWrite(
                a,
                a ? `Filed under ${a.label ?? "that anchor"}.` : "Left unanchored.",
              ),
            splitProposal,
            onSplit: (p) => {
              if (p.anchor.type === "person") {
                void createScopedAndOpen({
                  personId: p.anchor.id,
                  personName: p.anchor.label ?? "This person",
                  conversationId: chatContext?.conversationId ?? null,
                });
              }
            },
            onDismissSplit: () => {
              if (drift) setSplitDismissedKey(`${drift.anchor.type}:${drift.anchor.id}`);
            },
            anchorNotice: anchorNotice?.text ?? null,
            onUndoAnchor: () => {
              if (!anchorNotice) return;
              const prev = anchorNotice.prev;
              void (async () => {
                if (view.kind !== "chat") return;
                try {
                  const res = await setOpalChatAnchor(view.sessionId, prev, bearer);
                  setChatAnchor(anchorFromContract(res.conversation.anchor) ?? prev);
                  setAnchorNotice(null);
                  void loadSessions();
                } catch {
                  setError("That undo did not save.");
                }
              })();
            },
            onDismissAnchorNotice: () => setAnchorNotice(null),
          }}
        />
      )}
      {railOpen ? (
        <ConversationRail
          sessions={sessions}
          orbitGate={orbitGate}
          onClose={() => setRailOpen(false)}
          onNewChat={() => {
            setRailOpen(false);
            void newChat();
          }}
          onOpen={(id) => {
            setRailOpen(false);
            const known = sessions.find((s) => s.id === id);
            void openChat(id, known?.title ?? "New chat");
          }}
          onOpenOrbit={(anchor, context) => {
            setRailOpen(false);
            void openOrbitSheet(anchor, context);
          }}
          onUnarchive={(id) => {
            void (async () => {
              try {
                await setOpalChatArchived(id, false, bearer);
                void loadSessions();
              } catch {
                setError("That chat could not be unarchived.");
              }
            })();
          }}
        />
      ) : null}
      {orbitSheet ? (
        <OrbitSheet
          tieLabel={
            orbitSheet.anchor.type === "person"
              ? (contacts.find((c) => c.contact_user_id === orbitSheet.anchor.id)
                  ?.tieLabel ?? null)
              : null
          }
          anchor={orbitSheet.anchor}
          context={orbitSheet.context}
          plans={orbitSheet.plans}
          sessions={orbitSheet.sessions}
          onClose={() => setOrbitSheet(null)}
          onOpenPlan={(id) => {
            setOrbitSheet(null);
            onOpenGraph(id);
          }}
          onOpen={(id) => {
            setOrbitSheet(null);
            void openChat(id, "New chat", orbitSheet.context);
          }}
          onStartNew={() => {
            const ctx = orbitSheet.context;
            setOrbitSheet(null);
            if (orbitSheet.anchor.type === "person") {
              void createScopedAndOpen({
                personId: orbitSheet.anchor.id,
                personName: orbitSheet.anchor.label ?? ctx?.personName ?? "This person",
                conversationId: ctx?.conversationId ?? null,
              });
            } else if (ctx) {
              // Plan/place orbits start from the sheet's carried
              // context (person + plan), the scoped-birth contract.
              void createScopedAndOpen(ctx);
            } else {
              setError("A new chat in this orbit needs a person to be about.");
            }
          }}
          onRemove={(id) => {
            void (async () => {
              try {
                await removeOpalChatSession(id, bearer);
                refreshOrbitSheet();
                void loadSessions();
              } catch {
                setError("That remove did not happen.");
              }
            })();
          }}
          onArchive={(id, archived) => {
            void (async () => {
              try {
                await setOpalChatArchived(id, archived, bearer);
                refreshOrbitSheet();
                void loadSessions();
              } catch {
                setError("That archive did not save.");
              }
            })();
          }}
          onTogglePrivate={(next) => {
            void (async () => {
              try {
                await setOrbitPrivate(orbitSheet.anchor, next, bearer);
                // W21 (F6b): reflect the write in the sheet at once
                // (label + aria-pressed flip), then let the
                // read-back refresh confirm it from the server rows.
                setOrbitSheet((cur) =>
                  cur ? { ...cur, anchor: { ...cur.anchor, private: next } } : cur,
                );
                refreshOrbitSheet();
                void loadSessions();
              } catch {
                setError("That privacy change did not save.");
              }
            })();
          }}
          onOpenAnchorThread={
            orbitSheet.context?.conversationId && onOpenPersonThread
              ? () => {
                  const cid = orbitSheet.context?.conversationId;
                  setOrbitSheet(null);
                  if (cid) onOpenPersonThread(cid);
                }
              : undefined
          }
        />
      ) : null}
      {shareSheetOpen && shareCard ? (
        <ConversationShareSheet card={shareCard} onClose={() => setShareSheetOpen(false)} />
      ) : null}
      {orbitPromptKey ? (
        <OrbitUnlockPrompt
          orbitLabel={orbitPromptAnchor?.label ?? "This orbit"}
          passcodeSet={orbitPasscodeSet}
          onVerify={async (code) => {
            // JA-01: the route requires the anchor with the code —
            // the prompt's own anchor (from the host's prompt state)
            // is threaded through, never dropped.
            const anchor = orbitPromptAnchor;
            if (!anchor) return false;
            try {
              const res = await verifyOrbitLock(anchor.type, anchor.id, code, bearer);
              return res.unlocked === true;
            } catch {
              return false;
            }
          }}
          onSetPasscode={async (code) => {
            try {
              await setGraphLock(code, bearer);
              setOrbitPasscodeSet(true);
              return true;
            } catch {
              return false;
            }
          }}
          onUnlocked={() => {
            setUnlockedOrbits((prev) => new Set(prev).add(orbitPromptKey));
            setOrbitPromptKey(null);
            setNotice("Unlocked for this visit.");
          }}
          onClose={() => setOrbitPromptKey(null)}
        />
      ) : null}
      {notice ? (
        <p className="c2s-error-line" role="status" style={{ padding: "0 var(--gutter)" }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="c2s-error-line" role="alert" style={{ padding: "0 var(--gutter)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chats destination: C1 people list + thread + circle rows.          */
/* ------------------------------------------------------------------ */

/**
 * Repair #19 W13 - the person-profile adapter. Finished fields only,
 * from records the host already holds: the conversation (name,
 * handle, peers), the relationship rows (how you know them - matched
 * by the peer's real user id), and the thread's shared next-plan
 * fact. Anything absent stays null and the sheet renders nothing
 * for it. Group conversations keep peerCount so the sheet never
 * presents a group as one person: the host only opens the profile
 * for the thread identity, and the name shown is the conversation's
 * own title.
 */
const PROFILE_STATE_LABELS: Record<string, string> = {
  forming: "Forming",
  action: "Action needed",
  ready: "Ready",
  happening: "Happening",
  past: "Past",
};

/** One relationship row as the hosts hold it (from listRelationships). */
export type RelRow = {
  contact_user_id: string;
  type: string;
  family_subtype?: string | null;
  family_minor?: boolean;
};

export function profileProjectionFor(
  conversation: ConversationSummary,
  relRows: RelRow[],
  nextPlan: NextPlanFact | null,
): PersonProfileProjection {
  const firstPeer = conversation.peers[0] ?? null;
  const rel = firstPeer
    ? relRows.find((r) => r.contact_user_id === firstPeer.id)
    : undefined;
  return {
    name: conversation.title,
    handle: firstPeer?.handle ?? null,
    avatar: avatarOf(conversation.title, conversation.entity_tint ?? 0),
    relationshipLabel: rel ? tieLabel(rel.type, rel.family_subtype) : null,
    personId: conversation.peers.length === 1 ? (firstPeer?.id ?? null) : null,
    relationshipType: rel?.type ?? null,
    familySubtype: rel?.family_subtype ?? null,
    familyMinor: rel?.family_minor === true,
    closeCircle: rel ? isCloseCircleType(rel.type) : false,
    nextTogether: nextPlan
      ? {
          title: nextPlan.title,
          whenLine: nextPlan.when_label?.trim() ? nextPlan.when_label : "Time not set yet.",
          stateFamily: nextPlan.state,
          stateLabel: PROFILE_STATE_LABELS[nextPlan.state] ?? "Coming up",
        }
      : null,
    peerCount: conversation.peers.length,
  };
}

/**
 * Repair #19 W24 (DL-04 / DL-08) — THE one "my people" universe for
 * pickers. Before W24 the new-chat picker read GET /people.connected
 * (establishment-only) and dead-ended at "No one connected yet" on
 * accounts with ten live conversations, while every other surface
 * read conversations. The union truth the product now uses for every
 * picker: conversation peers (each carrying their conversation, so a
 * tap opens the real thread) ∪ relationship contacts and rows (a tap
 * ensures the real direct conversation). Deduped by person id; a
 * person with a conversation always carries it.
 */
export type PickerPerson = {
  personId: string;
  name: string;
  conversationId: string | null;
  tieLabel: string | null;
};

export function peopleUniverse(input: {
  conversations: Array<{
    id: string;
    peers?: Array<{ id: string; display_name: string }>;
  }>;
  contacts: Array<{
    contact_user_id: string;
    display_name?: string | null;
    type?: string | null;
    family_subtype?: string | null;
  }>;
  relRows: RelRow[];
}): PickerPerson[] {
  const byId = new Map<string, PickerPerson>();
  const tieById = new Map<string, string | null>(
    input.relRows.map((r) => [
      r.contact_user_id,
      tieLabel(r.type, r.family_subtype),
    ]),
  );
  for (const conv of input.conversations) {
    for (const peer of conv.peers ?? []) {
      if (!peer.id || !peer.display_name?.trim()) continue;
      const existing = byId.get(peer.id);
      if (existing) {
        if (!existing.conversationId) existing.conversationId = conv.id;
      } else {
        byId.set(peer.id, {
          personId: peer.id,
          name: peer.display_name.trim(),
          conversationId: conv.id,
          tieLabel: tieById.get(peer.id) ?? null,
        });
      }
    }
  }
  for (const contact of input.contacts) {
    if (!contact.contact_user_id || byId.has(contact.contact_user_id)) continue;
    const name = contact.display_name?.trim();
    if (!name) continue;
    byId.set(contact.contact_user_id, {
      personId: contact.contact_user_id,
      name,
      conversationId: null,
      tieLabel:
        tieById.get(contact.contact_user_id) ??
        tieLabel(contact.type, contact.family_subtype),
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function ChatsHost({
  bearer,
  viewerUserId,
  conversations,
  onConversationsChanged,
  openRequest,
  onOpenMemoryControls,
  onTalkToOpal,
}: {
  bearer?: string;
  viewerUserId?: string;
  conversations: ConversationSummary[];
  onConversationsChanged: () => void;
  /** ST-D: an external open request (from Search) - opens the real
   *  thread in the state its row showed. */
  openRequest?: { conversationId: string; nonce: number } | null;
  /** Repair #19 W13: route from a person profile to the memory controls room. */
  onOpenMemoryControls?: () => void;
  /** Repair #19 — the thread doorway / orbit sheet routes into the
   *  Opal conversation (the shell owns cross-route navigation). */
  onTalkToOpal?: (request: OpalOpenRequest) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  /** DIR-1: the thread's shared upcoming plan fact, read from the
   *  thread contract (listMessages) - the same fact the row carries. */
  const [threadNextPlan, setThreadNextPlan] = useState<NextPlanFact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** P8: the one people picker serves both create entries - chat
   *  mode opens (or ensures) the thread; call mode places the real
   *  conversation call for the picked person. */
  const [pickerMode, setPickerMode] = useState<"chat" | "call">("chat");
  const [people, setPeople] = useState<PickerPerson[]>([]);
  const [relTypes, setRelTypes] = useState<string[]>([]);
  const [relRows, setRelRows] = useState<RelRow[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [summarySweepId, setSummarySweepId] = useState<string | null>(null);
  // Repair #19 — this thread's orbit sheet (person anchor), fed by
  // the server-filtered person index query.
  const [threadOrbit, setThreadOrbit] = useState<{
    context: OpalConversationContext;
    sessions: PersonOpalSessionRow[];
  } | null>(null);
  // DIR-4: reveal items for the list (P1 line takeover) and thread.
  const [reveals, setReveals] = useState<RevealItem[]>([]);
  const [threadReveals, setThreadReveals] = useState<RevealItem[]>([]);
  // Repair #19: the Chats surface's Calls tab - the call log's place
  // in the C2 shell. Real records only (GET /calls via listCalls);
  // loaded when the tab is opened, re-read after a call is placed.
  const [commSurface, setCommSurface] = useState<"chats" | "calls">("chats");
  const [calls, setCalls] = useState<ProductCallHistory[]>([]);
  const [callsStatus, setCallsStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [callNote, setCallNote] = useState<string | null>(null);

  const loadCalls = useCallback(async () => {
    setCallsStatus("loading");
    try {
      const res = await listCalls(bearer);
      setCalls(res.calls ?? []);
      setCallsStatus("ready");
    } catch {
      setCallsStatus("error");
    }
  }, [bearer]);

  useEffect(() => {
    if (commSurface === "calls") void loadCalls();
  }, [commSurface, loadCalls]);

  /** Call back / call: place the REAL conversation call, then report
   *  the server's own returned status plainly and re-read the log
   *  (the new ringing row carries its own call_state fact). The C2
   *  shell has no call surface of its own today, so nothing here
   *  pretends to be one - the note is the outcome, verbatim. */
  const placeCall = useCallback(
    async (call: PeopleCallSummary) => {
      if (!call.conversationId) return;
      setCallNote(null);
      try {
        const res = await createConversationCall(call.conversationId, bearer);
        setCallNote(`Calling ${call.name} - ${res.call.status}.`);
        void loadCalls();
      } catch {
        setCallNote(`Couldn't start the call with ${call.name}. Try again.`);
      }
    },
    [bearer, loadCalls],
  );

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const feed = await listReveals(bearer);
        if (live) setReveals(feed.items ?? []);
      } catch {
        if (live) setReveals([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [bearer, conversations]);

  const dismissChatReveal = useCallback(
    async (item: RevealItem) => {
      try {
        const feed = await dismissReveal(item.reveal_key, bearer);
        setReveals(feed.items ?? []);
        setThreadReveals((prev) => (feed.items ?? []).filter((r) => prev.some((p) => p.reveal_key === r.reveal_key)));
      } catch {
        // Server truth wins; a failed dismissal changes nothing.
      }
    },
    [bearer],
  );

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await listRelationships(bearer);
        if (!live) return;
        setRelRows(
          (res.relationships ?? []).map((r) => ({
            contact_user_id: r.contact_user_id,
            type: typeof r.type === "string" ? r.type : "",
            family_subtype: r.family_subtype ?? null,
            family_minor: r.family_minor === true,
          })),
        );
        const types = [
          ...new Set(
            (res.relationships ?? [])
              .map((r) => (typeof r.type === "string" ? r.type : ""))
              .filter(Boolean),
          ),
        ];
        setRelTypes(types);
      } catch {
        if (live) setRelTypes([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [bearer]);

  const openThread = useCallback(
    async (conversationId: string) => {
      setSelectedId(conversationId);
      setError(null);
      try {
        const res = await listMessages(conversationId, bearer);
        setThreadNextPlan(res.next_plan ?? null);
        try {
          const feed = await listReveals(bearer, conversationId);
          setThreadReveals(feed.items ?? []);
        } catch {
          setThreadReveals([]);
        }
        const conv = conversations.find((c) => c.id === conversationId);
        const names = new Map((conv?.peers ?? []).map((p) => [p.id, p.display_name]));
        // Deckfix F2a: resolve any call-invite messages against the
        // viewer's real call records (the call log's own list) so the
        // thread renders the record's human line, never "call:<id>".
        const rawMessages = res.messages ?? [];
        let callLineById: ReadonlyMap<string, string> = new Map();
        if (rawMessages.some((m) => callInviteIdOf(m) !== null || m.message_type === "call_invite")) {
          try {
            const calls = await listCalls(bearer);
            callLineById = new Map(
              (calls.calls ?? []).map((call) => [call.id, callLineForCallRecord(call)]),
            );
          } catch {
            callLineById = new Map();
          }
        }
        setMessages(
          rawMessages.map((m) =>
            threadMsgFromProductMessage(m, { viewerUserId, names, callLineById }),
          ),
        );
      } catch {
        setMessages([]);
        setThreadNextPlan(null);
        setError("Messages could not load. Head back and try again.");
      }
    },
    [bearer, conversations, viewerUserId],
  );

  const lastOpenNonce = useRef(0);
  useEffect(() => {
    if (openRequest && openRequest.nonce !== lastOpenNonce.current) {
      lastOpenNonce.current = openRequest.nonce;
      void openThread(openRequest.conversationId);
    }
  }, [openRequest, openThread]);

  const correctTranscript = useCallback(
    async (messageId: string, text: string) => {
      if (!selectedId) return;
      await correctVoiceNoteTranscript(selectedId, messageId, text, bearer);
      await openThread(selectedId);
    },
    [bearer, openThread, selectedId],
  );

  const send = useCallback(
    async (text: string) => {
      if (!selectedId) return;
      setError(null);
      try {
        await sendMessage(selectedId, text, bearer);
        await openThread(selectedId);
        onConversationsChanged();
      } catch {
        setError("That did not send. Try again.");
      }
    },
    [bearer, onConversationsChanged, openThread, selectedId],
  );

  const openPicker = useCallback(async (mode: "chat" | "call" = "chat") => {
    setPickerMode(mode);
    setPickerOpen(true);
    // DL-04/DL-08: the picker reads the ONE union universe. The
    // conversation peers are already in this host's hands; the
    // relationship contacts/rows and the establishment list are
    // read fresh so a just-typed or just-connected person appears.
    let contacts: Array<{
      contact_user_id: string;
      display_name?: string | null;
      type?: string | null;
      family_subtype?: string | null;
    }> = [];
    let rows: RelRow[] = relRows;
    try {
      const res = await listRelationships(bearer);
      contacts = res.contacts ?? [];
      rows = (res.relationships ?? []).map((r) => ({
        contact_user_id: r.contact_user_id,
        type: typeof r.type === "string" ? r.type : "",
        family_subtype: r.family_subtype ?? null,
        family_minor: r.family_minor === true,
      }));
      setRelRows(rows);
    } catch {
      /* conversations alone still populate the picker */
    }
    try {
      const res = await listPeople(bearer);
      const established = (res.connected ?? [])
        .map((c) => {
          const anyC = c as unknown as Record<string, unknown>;
          const id =
            (typeof anyC.peer_user_id === "string" && anyC.peer_user_id) ||
            (typeof anyC.contact_user_id === "string" && anyC.contact_user_id) ||
            "";
          return id
            ? {
                contact_user_id: id,
                display_name:
                  typeof anyC.display_name === "string" ? anyC.display_name : null,
              }
            : null;
        })
        .filter((c): c is { contact_user_id: string; display_name: string | null } =>
          Boolean(c),
        );
      contacts = [...contacts, ...established];
    } catch {
      /* the union stands on conversations + relationships */
    }
    setPeople(peopleUniverse({ conversations, contacts, relRows: rows }));
  }, [bearer, conversations, relRows]);

  /** A picker tap: an existing conversation is used; a contact
   *  with none ensures the REAL direct conversation first. Chat
   *  mode then opens the thread; call mode places the REAL
   *  conversation call through the same placeCall path the call
   *  log's Call button uses, and lands on the Calls tab where the
   *  outcome note and the re-read log show the result. */
  const openPickerPerson = useCallback(
    async (person: PickerPerson) => {
      setPickerOpen(false);
      let cid = person.conversationId;
      if (!cid) {
        try {
          const res = await ensureDirectConversation(person.personId, bearer);
          cid =
            (res as { conversation_id?: string; conversation?: { id?: string } })
              .conversation_id ??
            (res as { conversation?: { id?: string } }).conversation?.id ??
            null;
          if (cid) onConversationsChanged();
        } catch {
          cid = null;
        }
      }
      if (!cid) {
        setError(
          pickerMode === "call"
            ? "That call could not start. Try again."
            : "That chat could not open. Try again.",
        );
        return;
      }
      if (pickerMode === "call") {
        setCommSurface("calls");
        void placeCall({
          id: person.personId,
          name: person.name,
          initials: initialsOf(person.name),
          metadata: "",
          conversationId: cid,
        });
        return;
      }
      void openThread(cid);
    },
    [bearer, openThread, onConversationsChanged, pickerMode, placeCall],
  );

  /** Repair #19 W24 (DL-01) — THE one relationship write for this
   *  host: resolves the relationship from the PERSON (the peer id),
   *  through setRelationshipType (PUT /relationships/:contact id,
   *  family leg included), then re-reads the relationship rows so
   *  every tie on screen is the server's read-back. */
  const saveRelationship = useCallback(
    async (personId: string, input: { type: string; familySubtype: string | null; familyMinor: boolean }) => {
      await setRelationshipType(personId, input.type, undefined, bearer, {
        familySubtype: input.familySubtype,
        familyMinor: input.familyMinor,
      });
      try {
        const res = await listRelationships(bearer);
        setRelRows(
          (res.relationships ?? []).map((r) => ({
            contact_user_id: r.contact_user_id,
            type: typeof r.type === "string" ? r.type : "",
            family_subtype: r.family_subtype ?? null,
            family_minor: r.family_minor === true,
          })),
        );
        setRelTypes([
          ...new Set(
            (res.relationships ?? [])
              .map((r) => (typeof r.type === "string" ? r.type : ""))
              .filter(Boolean),
          ),
        ]);
      } catch {
        /* the write landed; the next host load re-reads the rows */
      }
    },
    [bearer],
  );

  /** Repair #19: call-log rows for the Calls tab, adapted from the
   *  real GET /calls contract only - the finished history line from
   *  the server's own label (callHistoryLine, the same derivation
   *  the legacy log renders), the DIR-1 fact, and the call-state
   *  fact, all verbatim. A row opens a conversation only when that
   *  conversation is in this host's real list. */
  const callSummaries: PeopleCallSummary[] = calls.map((call) => {
    const line = callHistoryLine({
      historyLabel: call.history_label,
      createdAt: call.created_at,
      peerName: call.peer_name,
    });
    return {
      id: call.id,
      name: line.name,
      initials: initialsOf(line.name),
      metadata: line.metadata,
      conversationId:
        call.conversation_id &&
        conversations.some((c) => c.id === call.conversation_id)
          ? call.conversation_id
          : null,
      nextPlan: call.next_plan ?? null,
      entityTint: call.peer_tint ?? null,
      callState: call.call_state ?? null,
    };
  });

  const summaries: PeopleChatSummary[] = conversations.map((chat) => ({
    id: chat.id,
    name: chat.title,
    // DL-03: a quiet tie cue on the row, from the same rows the
    // profile reads. A dyad's single peer carries the tie; a group
    // row names no one person's tie.
    tieLabel:
      chat.peers?.length === 1
        ? (relRows.find((r) => r.contact_user_id === chat.peers[0].id)
            ? tieLabel(
                relRows.find((r) => r.contact_user_id === chat.peers[0].id)!.type,
                relRows.find((r) => r.contact_user_id === chat.peers[0].id)!
                  .family_subtype,
              )
            : null)
        : null,
    initials: initialsOf(chat.title),
    preview: conversationPreviewLabel(chat),
    timeLabel: timeLabelFor(chat.updated_at),
    unread: (chat.unread_count ?? 0) > 0,
    // DIR-1: the row's plan-awareness element renders from the
    // contract's shared upcoming plan fact (next_plan) - the
    // service-layer derivation. No fact, no element; never guessed.
    plan: null,
    nextPlan: chat.next_plan ?? null,
    entityTint: chat.entity_tint ?? null,
    // DIR-4 entry 7: a P1 reveal about this conversation's people
    // takes over the row's plan line (same slot, fire line added).
    reveal:
      reveals.find((r) => r.category === "P1" && r.conversation_id === chat.id) ?? null,
    onDismissReveal: (item: RevealItem) => void dismissChatReveal(item),
  }));

  // Repair #19 — the thread's person + doorway, derived ONLY from
  // the thread's own contract: the dyad peer, the DIR-1 fact (the
  // host's threadNextPlan, falling back to the row's), and the
  // thread's DIR-4 reveals. A group thread scopes to no one.
  const threadPerson = selected ? dyadPersonOf(selected) : null;
  const threadPersonContext = selected
    ? personOpalContext({
        personId: threadPerson?.personId,
        personName: threadPerson?.personName,
        conversationId: selected.id,
      })
    : null;
  const threadDoorway =
    selected && threadPersonContext
      ? opalDoorwayContext({
          fact: threadNextPlan ?? selected.next_plan ?? null,
          reveals: threadReveals,
          personId: threadPersonContext.personId,
          personName: threadPersonContext.personName,
          conversationId: selected.id,
        })
      : null;
  const threadFact = selected ? (threadNextPlan ?? selected.next_plan ?? null) : null;

  const openThreadOrbitSheet = async (context: OpalConversationContext) => {
    try {
      const res = await listOpalChatSessions(bearer, context.personId);
      const rows = personIndexRowsFromSummaries(res.conversations ?? []);
      setThreadOrbit({ context, sessions: sessionsForPerson(rows, context.personId) });
    } catch {
      setThreadOrbit({ context, sessions: [] });
    }
  };

  return (
    <div data-design="r18" className="c2s-c1-host" data-testid="c2-c1-chats-host">
      {selected ? (
        <div className="c2s-c1-thread-wrap">
          <ThreadShell
            name={selected.title}
            initials={initialsOf(selected.title)}
            sharedLine={
              // DL-14 / DL-03: a 1:1 thread's sub-line is the TIE
              // when one is set (it replaces the peer-name repeat,
              // which carried zero information); group threads keep
              // the peer-names line.
              selected.peers.length === 1
                ? (tieLabel(
                    relRows.find((r) => r.contact_user_id === selected.peers[0].id)
                      ?.type ?? null,
                    relRows.find((r) => r.contact_user_id === selected.peers[0].id)
                      ?.family_subtype,
                  ) ??
                  selected.peers.map((p) => p.display_name).join(", "))
                : selected.peers.length > 0
                  ? selected.peers.map((p) => p.display_name).join(", ")
                  : null
            }
            nextPlanFact={threadNextPlan ?? selected.next_plan ?? null}
            entityTint={selected.entity_tint ?? null}
            reveals={threadReveals}
            onDismissReveal={(item) => void dismissChatReveal(item)}
            onRevealAction={(item) => {
              if (item.plan_id) onConversationsChanged();
            }}
            messages={messages}
            plansById={new Map()}
            composerPlaceholder={`Message ${selected.title}`}
            onBack={() => setSelectedId(null)}
            onOpenProfile={() => setProfileOpen(true)}
            onSend={(text) => void send(text)}
            onCorrectTranscript={correctTranscript}
            opalDoorway={threadDoorway}
            onTalkToOpal={(ctx) => onTalkToOpal?.({ context: ctx })}
            personContext={threadPersonContext}
            onOpenOpalChats={(ctx) => void openThreadOrbitSheet(ctx)}
          />
          <VoiceNoteControl
            conversationId={selected.id}
            bearer={bearer}
            onSent={() => {
              void openThread(selected.id);
              onConversationsChanged();
            }}
          />
          {profileOpen ? (
            <PersonProfileSheet
              profile={profileProjectionFor(selected, relRows, threadNextPlan ?? selected.next_plan ?? null)}
              onSaveRelationship={
                selected.peers.length === 1
                  ? (input) => saveRelationship(selected.peers[0].id, input)
                  : undefined
              }
              onClose={() => setProfileOpen(false)}
              onMessage={() => setProfileOpen(false)}
              onOpenMemoryControls={
                onOpenMemoryControls
                  ? () => {
                      setProfileOpen(false);
                      onOpenMemoryControls();
                    }
                  : undefined
              }
            />
          ) : null}
          <div className="c2s-c1-checkin-bar">
            <CheckinCircleRow
              source={{ source_kind: "conversation", source_ref_id: selected.id }}
              bearer={bearer}
              onOpenSummary={(id) => setSummarySweepId(id)}
            />
          </div>
          {threadOrbit && threadPersonContext ? (
            <OrbitSheet
              tieLabel={
                threadPerson
                  ? tieLabel(
                      relRows.find((r) => r.contact_user_id === threadPerson.personId)
                        ?.type ?? null,
                      relRows.find((r) => r.contact_user_id === threadPerson.personId)
                        ?.family_subtype,
                    )
                  : null
              }
              anchor={{
                type: "person",
                id: threadOrbit.context.personId,
                label: threadOrbit.context.personName,
              }}
              context={threadOrbit.context}
              plans={
                threadFact
                  ? [
                      {
                        id: threadFact.plan_id,
                        title: threadFact.title,
                        line: [threadFact.when_label, threadFact.where_label]
                          .filter(Boolean)
                          .join(" - "),
                      },
                    ]
                  : []
              }
              sessions={threadOrbit.sessions}
              onClose={() => setThreadOrbit(null)}
              onOpen={(id) => {
                setThreadOrbit(null);
                onTalkToOpal?.({ context: threadOrbit.context, sessionId: id });
              }}
              onStartNew={() => {
                setThreadOrbit(null);
                onTalkToOpal?.({ context: threadOrbit.context, startNew: true });
              }}
              onRemove={(id) => {
                void (async () => {
                  try {
                    // The delete touches the Opal chat ONLY: no thread
                    // reload, no conversations refresh — the person
                    // thread is a different record and stays as-is.
                    await removeOpalChatSession(id, bearer);
                    await openThreadOrbitSheet(threadOrbit.context);
                  } catch {
                    setError("That remove did not happen.");
                  }
                })();
              }}
              onArchive={(id, archived) => {
                void (async () => {
                  try {
                    await setOpalChatArchived(id, archived, bearer);
                    await openThreadOrbitSheet(threadOrbit.context);
                  } catch {
                    setError("That archive did not save.");
                  }
                })();
              }}
              onOpenAnchorThread={() => setThreadOrbit(null)}
            />
          ) : null}
        </div>
      ) : commSurface === "calls" ? (
        <>
          <PeopleCallsList
            calls={callSummaries}
            status={callsStatus}
            onShowChats={() => setCommSurface("chats")}
            onOpenConversation={(call) => {
              if (call.conversationId) void openThread(call.conversationId);
            }}
            onCallBack={(call) => void placeCall(call)}
            onNewCall={() => void openPicker("call")}
          />
          {callNote ? (
            <p
              className="c2s-error-line"
              role="status"
              data-testid="c2-calls-note"
              style={{ padding: "0 var(--gutter)" }}
            >
              {callNote}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <PeopleChatsList
            chats={summaries}
            onNewChat={() => void openPicker()}
            onOpen={(id) => void openThread(id)}
            onShowCalls={() => setCommSurface("calls")}
          />
          {relTypes.length > 0 ? (
            <div className="c2s-c1-circles" data-testid="c2-c1-circles">
              <p className="c2s-c1-circles-title">Your circles</p>
              {relTypes.map((type) => (
                <div key={type} className="c2s-c1-circle">
                  {relationshipTypeLabel(type) ? (
                    <p className="c2s-c1-circle-label">{relationshipTypeLabel(type)}</p>
                  ) : null}
                  <CheckinCircleRow
                    source={{
                      source_kind: "relationship_set",
                      source_filter: { types: [type] },
                    }}
                    bearer={bearer}
                    onOpenSummary={(id) => setSummarySweepId(id)}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p className="c2s-error-line" role="alert" style={{ padding: "0 var(--gutter)" }}>
          {error}
        </p>
      ) : null}

      {pickerOpen ? (
        <TopLayer band="sheet">
          <div className="c2s-scrim" onClick={() => setPickerOpen(false)}>
            <div
              className="c2s-sheet"
              role="dialog"
              aria-label={pickerMode === "call" ? "Start a call" : "Start a chat"}
              data-testid="c2-c1-people-picker"
              data-picker-mode={pickerMode}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="c2s-sheet-title">
                {pickerMode === "call" ? "Start a call" : "Start a chat"}
              </p>
              {people.length === 0 ? (
                <EmptyBlock
                  headline="No one connected yet."
                  line="People you connect with will show up here."
                />
              ) : (
                people.map((person) => (
                  <button
                    key={person.personId}
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-c1-people-row"
                    onClick={() => void openPickerPerson(person)}
                  >
                    <span>
                      {person.name}
                      {person.tieLabel ? <small>{person.tieLabel}</small> : null}
                    </span>
                  </button>
                ))
              )}
              <button type="button" className="c2s-btn-text" onClick={() => setPickerOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </TopLayer>
      ) : null}

      {summarySweepId ? (
        <CheckinSummarySheet
          sweepId={summarySweepId}
          bearer={bearer}
          onClose={() => setSummarySweepId(null)}
        />
      ) : null}
    </div>
  );
}
