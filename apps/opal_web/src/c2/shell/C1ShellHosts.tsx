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
  createOpalChatSession,
  getOpalChatSession,
  listMessages,
  listOpalChatSessions,
  listPeople,
  listRelationships,
  postOpalSessionMessage,
  sendMessage,
  type ConversationSummary,
  type OpalChatMessage,
  type OpalPlanContract,
} from "../../api/productClient";
import {
  CenterChat,
  CenterSessionList,
  PeopleChatsList,
  ThreadShell,
  type CenterSessionSummary,
  type PeopleChatSummary,
  type ThreadMsg,
} from "../../opalUi/c1/C1Surfaces";
import type { PlanProjection } from "../../opalUi/c1/planProjection";
import { CheckinCircleRow } from "../../opalUi/CheckinCircleRow";
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

function threadMsgFromOpalMessage(m: OpalChatMessage): ThreadMsg {
  const planId =
    m.metadata && typeof m.metadata.plan_id === "string" ? m.metadata.plan_id : null;
  return {
    id: m.id,
    authorKind: m.role === "user" ? "person" : "opal",
    own: m.role === "user",
    body: m.body,
    planId,
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

export function CenterHost({
  bearer,
  opening,
  openingEvents,
  plans,
  onOpenGraph,
}: {
  bearer?: string;
  opening: CenterOpeningProjection;
  openingEvents: {
    openGraph: (cardId: string) => void;
    makeSomethingHappen: () => void;
    completeSlot: (cardId: string, slotKind: string) => void;
  };
  plans: OpalPlanContract[];
  onOpenGraph: (cardId: string) => void;
}) {
  const [view, setView] = useState<CenterView>({ kind: "deck" });
  const [sessions, setSessions] = useState<CenterSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionsLoaded = useRef(false);

  const plansById = useMemo(() => {
    const map = new Map<string, PlanProjection>();
    for (const plan of plans) map.set(plan.id, planProjectionFromContract(plan));
    return map;
  }, [plans]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await listOpalChatSessions(bearer);
      const rows = res.conversations ?? [];
      setSessions(
        rows.map((s) => ({
          id: s.id,
          title: s.title?.trim() ? s.title : "New chat",
          preview: s.last_message_preview ?? "",
          timeLabel: timeLabelFor(s.updated_at),
          isActive: s.active === true,
        })),
      );
      const active = rows.find((s) => s.active === true) ?? rows[0];
      setActiveSessionId(active?.id ?? null);
      sessionsLoaded.current = true;
      return rows;
    } catch {
      sessionsLoaded.current = true;
      return [];
    }
  }, [bearer]);

  const openChat = useCallback(
    async (sessionId: string, fallbackTitle: string) => {
      setError(null);
      try {
        const res = await getOpalChatSession(sessionId, bearer);
        setMessages((res.conversation.messages ?? []).map(threadMsgFromOpalMessage));
        setView({
          kind: "chat",
          sessionId: res.conversation.id,
          title: res.conversation.title?.trim() ? res.conversation.title : fallbackTitle,
        });
      } catch {
        setError("That chat could not load. Try again from the list.");
        setView({ kind: "sessions" });
      }
    },
    [bearer],
  );

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
      setMessages((res.conversation.messages ?? []).map(threadMsgFromOpalMessage));
      setView({
        kind: "chat",
        sessionId: res.conversation.id,
        title: res.conversation.title?.trim() ? res.conversation.title : "New chat",
      });
      void loadSessions();
    } catch {
      setError("A new chat could not start. Check your connection and try again.");
    }
  }, [activeSessionId, bearer, loadSessions, openChat, sessions]);

  const newChat = useCallback(async () => {
    setError(null);
    try {
      const res = await createOpalChatSession(bearer);
      setMessages((res.conversation.messages ?? []).map(threadMsgFromOpalMessage));
      setView({
        kind: "chat",
        sessionId: res.conversation.id,
        title: res.conversation.title?.trim() ? res.conversation.title : "New chat",
      });
      void loadSessions();
    } catch {
      setError("A new chat could not start. Check your connection and try again.");
    }
  }, [bearer, loadSessions]);

  const send = useCallback(
    async (text: string) => {
      if (view.kind !== "chat") return;
      setError(null);
      try {
        const res = await postOpalSessionMessage(view.sessionId, text, bearer);
        const returned = (res.messages ?? []).map(threadMsgFromOpalMessage);
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

  if (view.kind === "deck") {
    return (
      <>
        <C2CenterOpening
          projection={opening}
          events={{ ...openingEvents, openCenterChat: () => void openActiveChat() }}
        />
        {error ? (
          <p className="c2s-error-line" role="alert" style={{ padding: "0 var(--gutter)" }}>
            {error}
          </p>
        ) : null}
      </>
    );
  }

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
            onNewChat={() => void newChat()}
            onOpen={(id) => {
              const known = sessions.find((s) => s.id === id);
              void openChat(id, known?.title ?? "New chat");
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
        />
      )}
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

export function ChatsHost({
  bearer,
  viewerUserId,
  conversations,
  onConversationsChanged,
}: {
  bearer?: string;
  viewerUserId?: string;
  conversations: ConversationSummary[];
  onConversationsChanged: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [people, setPeople] = useState<
    Array<{ relationship_id: string; conversation_id: string; display_name?: string }>
  >([]);
  const [relTypes, setRelTypes] = useState<string[]>([]);
  const [summarySweepId, setSummarySweepId] = useState<string | null>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await listRelationships(bearer);
        if (!live) return;
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
        const conv = conversations.find((c) => c.id === conversationId);
        const names = new Map((conv?.peers ?? []).map((p) => [p.id, p.display_name]));
        setMessages(
          (res.messages ?? []).map((m) => ({
            id: m.id,
            authorKind: "person" as const,
            authorName: names.get(m.sender_user_id),
            own: Boolean(viewerUserId) && m.sender_user_id === viewerUserId,
            body: m.body,
          })),
        );
      } catch {
        setMessages([]);
        setError("Messages could not load. Head back and try again.");
      }
    },
    [bearer, conversations, viewerUserId],
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

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    try {
      const res = await listPeople(bearer);
      setPeople(res.connected ?? []);
    } catch {
      setPeople([]);
    }
  }, [bearer]);

  const summaries: PeopleChatSummary[] = conversations.map((chat) => ({
    id: chat.id,
    name: chat.title,
    initials: initialsOf(chat.title),
    preview: chat.preview,
    timeLabel: timeLabelFor(chat.updated_at),
    unread: (chat.unread_count ?? 0) > 0,
    // The conversations contract carries no plan state for the row
    // pill, so no pill renders - never a guessed one.
    plan: null,
  }));

  return (
    <div data-design="r18" className="c2s-c1-host" data-testid="c2-c1-chats-host">
      {selected ? (
        <div className="c2s-c1-thread-wrap">
          <ThreadShell
            name={selected.title}
            initials={initialsOf(selected.title)}
            sharedLine={
              selected.peers.length > 0
                ? selected.peers.map((p) => p.display_name).join(", ")
                : null
            }
            messages={messages}
            plansById={new Map()}
            composerPlaceholder={`Message ${selected.title}`}
            onBack={() => setSelectedId(null)}
            onSend={(text) => void send(text)}
          />
          <div className="c2s-c1-checkin-bar">
            <CheckinCircleRow
              source={{ source_kind: "conversation", source_ref_id: selected.id }}
              bearer={bearer}
              onOpenSummary={(id) => setSummarySweepId(id)}
            />
          </div>
        </div>
      ) : (
        <>
          <PeopleChatsList
            chats={summaries}
            onNewChat={() => void openPicker()}
            onOpen={(id) => void openThread(id)}
          />
          {relTypes.length > 0 ? (
            <div className="c2s-c1-circles" data-testid="c2-c1-circles">
              <p className="c2s-c1-circles-title">Your circles</p>
              {relTypes.map((type) => (
                <div key={type} className="c2s-c1-circle">
                  <p className="c2s-c1-circle-label">{type}</p>
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
              aria-label="Start a chat"
              data-testid="c2-c1-people-picker"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="c2s-sheet-title">Start a chat</p>
              {people.length === 0 ? (
                <EmptyBlock
                  headline="No one connected yet."
                  line="People you connect with will show up here."
                />
              ) : (
                people.map((person) => (
                  <button
                    key={person.relationship_id}
                    type="button"
                    className="c2s-sheet-row"
                    data-testid="c2-c1-people-row"
                    onClick={() => {
                      setPickerOpen(false);
                      void openThread(person.conversation_id);
                    }}
                  >
                    <span>{person.display_name ?? "Connected person"}</span>
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
