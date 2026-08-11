import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PLANS,
  type ChatPreview,
  type Message,
  type NeedItem,
} from "./data";
import { PRODUCT_COPY } from "./designTokens";
import { OpalLockup, OpalMark } from "./brand/OpalLogo";
import { FIRST_RUN_STORAGE_KEY } from "./brand/brand";
import { FirstRunExperience } from "./onboarding/FirstRunExperience";
import { ActivationFlow } from "./ActivationFlow";
import { FindPeopleFlow } from "./people/FindPeopleFlow";
import {
  acceptInvitation,
  apiConfigured,
  fetchSession,
  getAvailabilityIntervention,
  getAvailabilityOverlap,
  listConversations,
  listIncoming,
  listMessages,
  listMyAvailabilityWindows,
  loadSession,
  previewInviteShare,
  resumeInviteContinuation,
  saveSession,
  setMemoryAccessToken,
  sendMessage,
  shareAvailabilityWindows,
  signOut,
  type AvailabilityIntervention,
  type AvailabilityOverlap,
  type ProductSession,
  type ProductSignal,
} from "./api/productClient";
import {
  productRealtime,
  type ChannelMessage,
  type ConnectionState,
} from "./realtime/RealtimeClient";
import {
  semanticStateForSignal,
  visualShellProps,
} from "./theme/technicolorProduction";
import { AvailabilitySheet } from "./availability/AvailabilitySheet";
import { formatOverlapRange } from "./availability/formatRange";
import {
  contextualSharedCopy,
  RELATIONSHIP_PULSE_EXPERIMENT,
  resolvePrimaryOpalSurface,
} from "./opalUi/grammar";
import { ContextChip } from "./opalUi/ContextChip";
import { PrivateGuidance } from "./opalUi/PrivateGuidance";
import { OpalInsightField } from "./opalUi/OpalInsightField";
import { OpalResolution } from "./opalUi/OpalResolution";
import {
  formatHumanTime,
  isConsequentialNeed,
  isDurableForPlans,
  signalDetail,
  strongestPerConversation,
  surfaceLabel,
} from "./sharedReality";

type Tab = "home" | "chats" | "plans" | "you";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "chats", label: "Chats" },
  { id: "plans", label: "Plans" },
  { id: "you", label: "You" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Map Elixir signal kinds / lifecycle stages to demo SignalKind tokens. */
function mapSignalKind(
  kind?: string,
): import("./data").SignalKind | undefined {
  if (!kind) return undefined;
  switch (kind) {
    case "plan_forming":
      return "plan_forming";
    case "open_loop":
    case "still_open":
    case "will_know_later":
      return "open_loop";
    case "ready":
      return "ready";
    case "follow_through":
    case "handled":
      return "follow_through";
    case "moment":
      return "moment";
    case "availability_overlap":
    case "option_surfaced":
      return "availability_overlap";
    case "set":
      return "set";
    default:
      return "plan_forming";
  }
}

const FIND_TIME_HINT_KEY = "opal.find_time_hint.v1";
const PRIVATE_DISMISS_KEY = "opal.private_dismissed.v1";

function readPrivateDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(PRIVATE_DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writePrivateDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(PRIVATE_DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    /* private mode */
  }
}

function ConnectionHint({ state }: { state: ConnectionState }) {
  if (state === "connected" || state === "offline") return null;
  const label =
    state === "reconnecting" || state === "connecting"
      ? "Reconnecting"
      : state === "session_expired"
        ? "Sign in again"
        : state === "failed"
          ? "Connection issue"
          : null;
  if (!label) return null;
  return (
    <div className="chat-header-sub" role="status" aria-live="polite">
      {label}
    </div>
  );
}

function readFirstRunDone(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFirstRunDone(): void {
  try {
    localStorage.setItem(FIRST_RUN_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Opal product shell: futuristic, chats-first, identity-forward. */
export function OpalApp() {
  const [tab, setTab] = useState<Tab>("chats");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  // Do not seed fake social graph for nonmembers or empty new members.
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [showFirstRun, setShowFirstRun] = useState(() => !readFirstRunDone());
  const [session, setSession] = useState<ProductSession | null>(() => loadSession());
  const [authReady, setAuthReady] = useState(false);
  const [liveSignals, setLiveSignals] = useState<ProductSignal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("offline");
  const [findPeopleOpen, setFindPeopleOpen] = useState(false);
  const [findTimeOpen, setFindTimeOpen] = useState(false);
  const [availabilityOverlap, setAvailabilityOverlap] =
    useState<AvailabilityOverlap | null>(null);
  const [showFindTimeHint, setShowFindTimeHint] = useState(false);
  const [overlapExpanded, setOverlapExpanded] = useState(false);
  const [privateDismissed, setPrivateDismissed] = useState<Set<string>>(
    () => readPrivateDismissed(),
  );
  /** Owner has at least one private window — drives proactive private nudge. */
  const [hasPrivateWindows, setHasPrivateWindows] = useState(false);
  /** Backend sufficiency decision (preferred over local heuristics). */
  const [availabilityIntervention, setAvailabilityIntervention] =
    useState<AvailabilityIntervention | null>(null);
  /** Edge one-shot animation keys already played (conversation:threshold). */
  const edgeAnimatedRef = useRef<Set<string>>(new Set());
  const [edgeAnimateKey, setEdgeAnimateKey] = useState<string | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<{ id: string }[]>([]);
  const [socialMoment, setSocialMoment] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const authenticated = Boolean(session?.user_id);

  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  const refreshPrivateWindows = useCallback(async (bearer?: string) => {
    try {
      const w = await listMyAvailabilityWindows(bearer);
      setHasPrivateWindows((w.windows?.length ?? 0) > 0);
    } catch {
      /* keep prior */
    }
  }, []);

  const refreshAvailabilityIntervention = useCallback(
    async (conversationId: string, bearer?: string) => {
      try {
        const i = await getAvailabilityIntervention(conversationId, bearer);
        setAvailabilityIntervention(i);
        if (i.overlap?.overlap_status === "overlap_found") {
          setAvailabilityOverlap(i.overlap);
        } else if (i.decision === "enough_to_compute") {
          /* keep prior overlap if any */
        } else if (
          i.decision === "needs_input" ||
          i.decision === "no_useful_intervention"
        ) {
          setAvailabilityOverlap(null);
        }
        setHasPrivateWindows(
          (i.suggested_window_ids?.length ?? 0) > 0 ||
            i.decision === "needs_permission" ||
            i.decision === "needs_confirmation",
        );
      } catch {
        setAvailabilityIntervention(null);
      }
    },
    [],
  );

  const dismissPrivate = useCallback((id: string) => {
    setPrivateDismissed((prev) => {
      const next = new Set(prev).add(id);
      writePrivateDismissed(next);
      return next;
    });
  }, []);

  // Edge one-shot on chip ambient only (real threshold, not sheet remount).
  useEffect(() => {
    if (!activeChatId) return;
    const kind = chats.find((c) => c.id === activeChatId)?.signal;
    const primary = resolvePrimaryOpalSurface({
      signalKind: kind,
      overlap: availabilityOverlap,
      findTimeOpen,
      hasPrivateWindows,
      privateDismissed,
    });
    if (primary.kind !== "chip" || !primary.withEdge) return;
    const key = `${activeChatId}:chip:${kind ?? "none"}`;
    if (edgeAnimatedRef.current.has(key)) return;
    edgeAnimatedRef.current.add(key);
    setEdgeAnimateKey(key);
    const t = window.setTimeout(() => {
      setEdgeAnimateKey((cur) => (cur === key ? null : cur));
    }, 520);
    return () => window.clearTimeout(t);
  }, [
    activeChatId,
    availabilityOverlap,
    chats,
    findTimeOpen,
    hasPrivateWindows,
    privateDismissed,
  ]);

  const applyChannelMessage = useCallback((raw: ChannelMessage) => {
    const me = sessionRef.current?.user_id;
    const openId = activeChatIdRef.current;
    const ui: Message = {
      id: raw.id,
      from: me && raw.sender_user_id === me ? "me" : "them",
      body: raw.body,
      time: raw.created_at
        ? new Date(raw.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "Now",
      serverSeq: raw.server_seq,
      clientMessageId: raw.client_message_id,
    };
    productRealtime.noteServerSeq(raw.conversation_id, raw.server_seq);
    setThreads((prev) => {
      const list = prev[raw.conversation_id] ?? [];
      if (
        list.some(
          (m) =>
            m.id === ui.id ||
            (ui.clientMessageId && m.clientMessageId === ui.clientMessageId),
        )
      ) {
        return prev;
      }
      const next = [...list, ui].sort((a, b) => {
        if (a.serverSeq != null && b.serverSeq != null) return a.serverSeq - b.serverSeq;
        return 0;
      });
      return { ...prev, [raw.conversation_id]: next };
    });
    setChats((prev) =>
      prev.map((c) =>
        c.id === raw.conversation_id
          ? {
              ...c,
              preview: raw.body,
              time: "Now",
              unread:
                c.id === openId || ui.from === "me" ? c.unread : (c.unread ?? 0) + 1,
            }
          : c,
      ),
    );
  }, []);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  );
  const messages = activeChatId ? threads[activeChatId] ?? [] : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeChatId]);

  const refreshLive = useCallback(async (s: ProductSession) => {
    setLoadingLive(true);
    setLoadError(null);
    if (!apiConfigured()) {
      setLoadError("Could not connect. Opal services are not configured.");
      setChats([]);
      setLoadingLive(false);
      return;
    }
    try {
      const data = await listConversations(s.access_token);
      const strongest = strongestPerConversation(data.signals || []);
      const byConv = new Map(strongest.map((sig) => [sig.conversation_id, sig]));
      const mapped: ChatPreview[] = data.conversations.map((c) => {
        const sig = byConv.get(c.id);
        return {
          id: c.id,
          name: c.title,
          preview: c.preview || "No messages yet",
          time: formatHumanTime(c.updated_at),
          // Peer context only — never put journey signals under a person's name.
          contextLine: c.peers.map((p) => p.display_name).join(", ") || undefined,
          // Human shared reality — never raw stage tokens like "Set".
          signalLabel: surfaceLabel(sig),
          signal: mapSignalKind(sig?.kind || sig?.lifecycle_stage),
        };
      });
      setChats(mapped);
      setLiveSignals(data.signals || []);
      // Needs you: only consequential resolve/execute gaps — not every signal.
      setNeeds(
        strongest
          .filter(isConsequentialNeed)
          .map((sig, i) => ({
            id: `sig-${i}`,
            title: surfaceLabel(sig) || "Needs a decision",
            detail: signalDetail(sig) || "From your conversation",
            chatId: sig.conversation_id,
          })),
      );
    } catch (e) {
      setLoadError((e as Error).message || "Could not load conversations");
      setChats([]);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  // Boot / refresh: recover via memory bearer OR HttpOnly cookie (credentials include).
  // Never treat a local profile alone as authenticated without a live session probe.
  // Never leave "Preparing…" forever — session/list hangs must surface recovery.
  useEffect(() => {
    let cancelled = false;
    const BOOT_MS = 12_000;

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          p,
          new Promise<T>((_, reject) => {
            timer = setTimeout(() => {
              const err = new Error("Opal took too long to respond. Try again.") as Error & {
                code?: string;
              };
              err.code = "boot_timeout";
              reject(err);
            }, ms);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    (async () => {
      if (!apiConfigured()) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      if (session?.access_token) setMemoryAccessToken(session.access_token);

      try {
        // Works with bearer when present; otherwise relies on cross-site session cookie.
        const me = await withTimeout(fetchSession(session?.access_token), BOOT_MS);
        if (cancelled) return;
        if (me.user?.id) {
          const next: ProductSession = {
            user_id: me.user.id,
            display_name: me.user.display_name,
            handle: me.user.handle,
            session_id: session?.session_id,
            access_token: session?.access_token || undefined,
          };
          setSession(next);
          saveSession(next);
          // Mark ready before secondary loads so UI never sticks on Preparing.
          if (!cancelled) setAuthReady(true);
          try {
            await withTimeout(refreshLive(next), BOOT_MS);
          } catch (e) {
            if (!cancelled) {
              setLoadError(
                (e as Error)?.message || "Could not load conversations. Try again.",
              );
            }
          }
          try {
            const inv = await withTimeout(listIncoming(next.access_token), BOOT_MS);
            if (!cancelled) setIncomingInvites(inv.invitations || []);
          } catch {
            /* ignore */
          }
          return;
        }
      } catch (e) {
        // Cookie blocked, timeout, or session dead: drop stale profile → activation.
        if (session) {
          saveSession(null);
          if (!cancelled) setSession(null);
        }
        const code = (e as Error & { code?: string })?.code;
        if (code === "boot_timeout" || code === "network_error") {
          if (!cancelled) {
            setLoadError(
              (e as Error)?.message || "Could not reach Opal. Check connection and try again.",
            );
          }
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount for refresh recovery; activation updates session separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invitation deep link: mint server continuation (never keep raw token in localStorage).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        // Public preview mints short-lived continuation_id; drop raw token from URL.
        const preview = await previewInviteShare(token);
        if (cancelled) return;
        if (preview.continuation_id) {
          try {
            sessionStorage.setItem("opal_invite_continuation", preview.continuation_id);
          } catch {
            /* private mode */
          }
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      } catch {
        /* invalid or expired */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // After activation: resume invitation via continuation id (server authoritative).
  useEffect(() => {
    if (!authenticated || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      try {
        let continuation: string | null = null;
        try {
          continuation = sessionStorage.getItem("opal_invite_continuation");
        } catch {
          continuation = null;
        }
        if (!continuation) return;
        const resumed = await resumeInviteContinuation(continuation, session.access_token);
        if (cancelled || !resumed.invitation_id) return;
        setIncomingInvites((prev) =>
          prev.some((p) => p.id === resumed.invitation_id)
            ? prev
            : [...prev, { id: resumed.invitation_id }],
        );
        setTab("chats");
      } catch {
        try {
          sessionStorage.removeItem("opal_invite_continuation");
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, session?.access_token]);

  // Phoenix realtime lifecycle for authenticated product sessions.
  // Do not depend on chat selection — restarting the socket on every open thrashs reconnects.
  useEffect(() => {
    if (!authenticated || !session || !apiConfigured()) {
      productRealtime.stop();
      return;
    }
    const offMsg = productRealtime.onMessage(applyChannelMessage);
    const offState = productRealtime.onState(setConnectionState);
    const offAv = productRealtime.onAvailability((_ev, _payload) => {
      const id = activeChatIdRef.current;
      const token = sessionRef.current?.access_token;
      if (!id || !token) return;
      void refreshAvailabilityIntervention(id, token);
    });
    void productRealtime.start(session.access_token).catch(() => {
      /* connection state surfaces calmly */
    });
    return () => {
      offMsg();
      offState();
      offAv();
      productRealtime.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, session?.user_id, session?.access_token]);

  const completeFirstRun = () => {
    writeFirstRunDone();
    setShowFirstRun(false);
  };

  const openChat = async (id: string) => {
    if (activeChatId && activeChatId !== id) {
      productRealtime.leaveConversation(activeChatId);
    }
    setActiveChatId(id);
    setAvailabilityOverlap(null);
    setAvailabilityIntervention(null);
    setFindTimeOpen(false);
    setOverlapExpanded(false);
    try {
      setShowFindTimeHint(localStorage.getItem(`${FIND_TIME_HINT_KEY}:${id}`) !== "1");
    } catch {
      setShowFindTimeHint(true);
    }
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setDraft("");
    if (session) {
      try {
        const data = await listMessages(id, session.access_token);
        const mapped: Message[] = data.messages.map((m) => {
          productRealtime.noteServerSeq(id, m.server_seq);
          return {
            id: m.id,
            from: m.sender_user_id === session.user_id ? "me" : "them",
            body: m.body,
            time: new Date(m.created_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            }),
            serverSeq: m.server_seq,
            clientMessageId: m.client_message_id,
          };
        });
        setThreads((prev) => ({ ...prev, [id]: mapped }));
        const primary =
          strongestPerConversation(
            (data.signals || []).map((s) => ({ ...s, conversation_id: id })),
          )[0] || data.signals?.[0];
        if (primary) {
          setChats((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    signalLabel: surfaceLabel(primary),
                    signal: mapSignalKind(primary.kind || primary.lifecycle_stage),
                    // Keep contextLine as peer names, not journey labels.
                  }
                : c,
            ),
          );
        } else {
          setChats((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, signalLabel: undefined, signal: undefined } : c,
            ),
          );
        }
        await refreshAvailabilityIntervention(id, session.access_token);
        void refreshPrivateWindows(session.access_token);
      } catch {
        /* keep empty */
      }
      // Join authorized Channel; backend membership is decisive.
      const join = await productRealtime.joinConversation(id);
      if (join === "denied") {
        setLoadError("You cannot open that conversation.");
        setActiveChatId(null);
      }
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeChatId) return;
    if (session) {
      try {
        // Primary send path: HTTP. Channel receives broadcast for peers and self-reconcile.
        const res = await sendMessage(activeChatId, body, session.access_token);
        const m = res.message;
        productRealtime.noteServerSeq(activeChatId, m.server_seq);
        const activeSignal =
          strongestPerConversation(
            (res.signals || []).map((s) => ({
              ...s,
              conversation_id: activeChatId,
            })),
          )[0] || res.signals?.[0];
        const msg: Message = {
          id: m.id,
          from: "me",
          body: m.body,
          time: "Now",
          serverSeq: m.server_seq,
          clientMessageId: m.client_message_id,
          // Opal moment is journey state, not part of the human bubble.
          signal: activeSignal
            ? {
                kind:
                  mapSignalKind(activeSignal.kind || activeSignal.lifecycle_stage) ||
                  "plan_forming",
                label: surfaceLabel(activeSignal) || activeSignal.label,
              }
            : undefined,
        };
        setThreads((prev) => {
          const list = prev[activeChatId] ?? [];
          if (
            list.some(
              (x) =>
                x.id === msg.id ||
                (msg.clientMessageId && x.clientMessageId === msg.clientMessageId),
            )
          ) {
            return prev;
          }
          return { ...prev, [activeChatId]: [...list, msg] };
        });
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  preview: body,
                  time: "Now",
                  signalLabel: surfaceLabel(activeSignal) || c.signalLabel,
                  signal: activeSignal
                    ? mapSignalKind(activeSignal.kind || activeSignal.lifecycle_stage)
                    : c.signal,
                }
              : c,
          ),
        );
        setDraft("");
        return;
      } catch (e) {
        setLoadError((e as Error).message || "Send failed");
        return;
      }
    }
    // Unauthenticated preview path only (seed)
    const msg: Message = {
      id: `local-${Date.now()}`,
      from: "me",
      body,
      time: "Now",
    };
    setThreads((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] ?? []), msg],
    }));
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, preview: body, time: "Now" } : c,
      ),
    );
    setDraft("");
  };

  if (authenticated && activeChat) {
    // ONE meaningful Opal surface — never stack inventory.
    const primary = resolvePrimaryOpalSurface({
      signalKind: activeChat.signal,
      overlap: availabilityOverlap,
      findTimeOpen,
      hasPrivateWindows,
      privateDismissed,
      overlapExpanded,
      intervention: availabilityIntervention,
    });
    const composerHasOpal =
      primary.kind === "chip" || primary.kind === "private";
    const chipEdgeKey = `${activeChatId ?? ""}:chip:${activeChat.signal ?? "none"}`;
    const animateChipEdge =
      primary.kind === "chip" &&
      primary.withEdge &&
      edgeAnimateKey === chipEdgeKey;

    return (
      <div
        className="app app-futura"
        aria-label={`Conversation with ${activeChat.name}`}
        data-testid="member-conversation"
        data-member-nav="true"
      >
        <div className="app-ambient" aria-hidden />
        <header className="chat-header glass">
          <button
            type="button"
            className="icon-btn"
            aria-label="Back to chats"
            onClick={() => {
              if (activeChatId) productRealtime.leaveConversation(activeChatId);
              setActiveChatId(null);
            }}
          >
            <BackIcon />
          </button>
          <div className="avatar avatar-lumen" aria-hidden>
            {initials(activeChat.name)}
          </div>
          <div className="chat-header-meta">
            <div className="chat-header-name">{activeChat.name}</div>
            {activeChat.contextLine ? (
              <div className="chat-header-sub" data-testid="chat-context">
                {activeChat.contextLine}
              </div>
            ) : null}
            <ConnectionHint state={connectionState} />
          </div>
        </header>

        {/* Resolution moment: shared reality headline, not "Set" taxonomy. */}
        {primary.kind === "set" ? (
          <OpalResolution detail={activeChat.signalLabel || null} />
        ) : null}

        {RELATIONSHIP_PULSE_EXPERIMENT && primary.kind === "chip" ? (
          <div
            className="opal-pulse-experiment"
            data-testid="relationship-pulse-experiment"
            aria-hidden
          />
        ) : null}

        <div className="thread" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`bubble-row ${m.from === "me" ? "out" : "in"}`}>
              <div className={`bubble ${m.from === "me" ? "out" : "in"}`}>
                <p>{m.body}</p>
                <time>{m.time}</time>
              </div>
              {/* Per-message signals: only when not competing with primary surface */}
              {m.signal &&
              primary.kind === "none" &&
              m.signal.kind !== "plan_forming" &&
              m.signal.kind !== "open_loop" ? (
                <div
                  className={`opal-moment inline signal-${m.signal.kind}`}
                  role="status"
                  data-testid="opal-moment"
                  data-state={semanticStateForSignal(m.signal.kind)}
                >
                  <span className="opal-moment-mark" aria-hidden>
                    ◈
                  </span>
                  <span className="opal-moment-label">
                    {contextualSharedCopy(
                      m.signal.kind === "set" || m.signal.kind === "ready"
                        ? "set"
                        : "quiet",
                    ) || m.signal.label}
                  </span>
                </div>
              ) : null}
            </div>
          ))}

          {/* Screen 2: Find a time UNDER causal messages (same styling, order only) */}
          {primary.kind === "chip" ? (
            <div
              className={`opal-context-chip-wrap${
                primary.withEdge ? " opal-chip-edge" : ""
              }${animateChipEdge ? " opal-edge-animate" : ""}`}
            >
              <ContextChip
                label={primary.label}
                onClick={() => {
                  setFindTimeOpen(true);
                  setShowFindTimeHint(false);
                  try {
                    localStorage.setItem(
                      `${FIND_TIME_HINT_KEY}:${activeChatId}`,
                      "1",
                    );
                  } catch {
                    /* private mode */
                  }
                }}
              />
            </div>
          ) : null}

          {/* Screen 4: private Opal moment in-thread after causal content */}
          {primary.kind === "private" ? (
            <PrivateGuidance
              text={primary.text}
              onDismiss={() => dismissPrivate(primary.id)}
              actionLabel={
                availabilityIntervention?.action_label || undefined
              }
              onAction={
                availabilityIntervention?.action_label
                  ? () => {
                      const ids =
                        availabilityIntervention.suggested_window_ids ?? [];
                      const token = session?.access_token;
                      const cid = activeChatId;
                      // Share it / Share → intentional share of suggested windows
                      if (
                        ids.length > 0 &&
                        cid &&
                        token &&
                        /share/i.test(
                          availabilityIntervention.action_label || "",
                        )
                      ) {
                        void shareAvailabilityWindows(cid, ids, token)
                          .then((res) => {
                            if (res.overlap?.overlap_status === "overlap_found") {
                              setAvailabilityOverlap(res.overlap);
                            }
                            return refreshAvailabilityIntervention(cid, token);
                          })
                          .catch(() => {
                            /* quiet */
                          });
                        return;
                      }
                      // Update times / Find a time path
                      setFindTimeOpen(true);
                      setShowFindTimeHint(false);
                    }
                  : undefined
              }
            />
          ) : null}

          {primary.kind === "overlap" ? (
            <>
              {primary.overlaps.length === 1 || primary.expand ? (
                <OpalInsightField
                  insight={primary.label}
                  groupLine={primary.groupLine}
                  discovery={primary.overlaps.length === 1}
                  options={primary.overlaps.map((o, i) => ({
                    id: `${o.display_start}-${i}`,
                    label:
                      formatOverlapRange(o.display_start, o.display_end) ||
                      `Option ${i + 1}`,
                  }))}
                  onChoose={(opt) => {
                    setDraft(
                      `${opt.label} works for me — does that work for you?`,
                    );
                    setOverlapExpanded(false);
                    document.getElementById("composer-input")?.focus();
                  }}
                />
              ) : (
                <div
                  className="opal-moment inline moment-enter signal-availability_overlap has-detail"
                  role="button"
                  data-testid="opal-moment-availability-overlap"
                  data-state={semanticStateForSignal("availability_overlap")}
                  aria-expanded={false}
                  tabIndex={0}
                  onClick={() => setOverlapExpanded(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOverlapExpanded(true);
                    }
                  }}
                >
                  <span className="opal-moment-mark" aria-hidden>
                    ◈
                  </span>
                  <span className="opal-moment-label">{primary.label}</span>
                  {primary.groupLine ? (
                    <span className="opal-group-share-count">
                      {primary.groupLine}
                    </span>
                  ) : null}
                  <span className="opal-moment-detail">Tap to see</span>
                </div>
              )}
            </>
          ) : null}
          <div ref={endRef} />
        </div>

        {primary.kind === "sheet" && activeChatId ? (
          <AvailabilitySheet
            conversationId={activeChatId}
            conversationName={activeChat.name}
            bearer={session?.access_token}
            onClose={() => setFindTimeOpen(false)}
            onOverlap={(o) => {
              setAvailabilityOverlap(
                o?.overlap_status === "overlap_found" ? o : null,
              );
              setOverlapExpanded(false);
              void refreshPrivateWindows(session?.access_token);
              if (activeChatId) {
                void refreshAvailabilityIntervention(
                  activeChatId,
                  session?.access_token,
                );
              }
            }}
          />
        ) : null}

        <form
          className={`composer glass${
            composerHasOpal ? " has-opal-context" : ""
          }${primary.kind === "set" ? " has-opal-set" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="composer-input">
            Message
          </label>
          <input
            id="composer-input"
            className="composer-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PRODUCT_COPY.composerPlaceholder}
            autoComplete="off"
          />
          <button
            type="submit"
            className="send-btn"
            aria-label="Send message"
            disabled={!draft.trim()}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    );
  }

  // --- Pre-membership surfaces: walkthrough or activation only. No member nav. ---
  if (showFirstRun) {
    const visual = visualShellProps("walkthrough");
    return (
      <div
        className={`app app-futura app-premember ${visual.className}`.trim()}
        aria-label="Opal introduction"
        data-testid="premember-walkthrough-shell"
        data-member-nav="false"
        data-visual-phase={visual["data-visual-phase"]}
        data-technicolor={visual["data-technicolor"]}
      >
        <div className="app-ambient" aria-hidden />
        <FirstRunExperience open onComplete={completeFirstRun} />
      </div>
    );
  }

  if (!authenticated) {
    if (!authReady) {
      const visual = visualShellProps("activation");
      return (
        <div
          className={`app app-futura app-premember ${visual.className}`.trim()}
          aria-label="Opal"
          data-testid="premember-boot-shell"
          data-member-nav="false"
          data-visual-phase={visual["data-visual-phase"]}
          data-technicolor={visual["data-technicolor"]}
        >
          <div className="app-ambient" aria-hidden />
          <header className="topbar glass">
            <OpalLockup size="md" />
          </header>
          <main className="pane">
            <p className="activation-status" role="status">
              Preparing…
            </p>
            {loadError ? (
              <p className="activation-error" role="alert">
                {loadError}
              </p>
            ) : null}
          </main>
        </div>
      );
    }

    const visual = visualShellProps("activation");
    return (
      <div
        className={`app app-futura app-premember ${visual.className}`.trim()}
        aria-label="Opal activation"
        data-testid="premember-activation-shell"
        data-member-nav="false"
        data-visual-phase={visual["data-visual-phase"]}
        data-technicolor={visual["data-technicolor"]}
      >
        <div className="app-ambient" aria-hidden />
        <header className="topbar glass">
          <OpalLockup size="md" />
        </header>
        <main className="pane">
          {loadError ? (
            <p className="activation-error" role="alert" data-testid="boot-error">
              {loadError}
            </p>
          ) : null}
          {!apiConfigured() ? (
            <div className="activation">
              <p className="activation-error" role="alert">
                Could not connect. Start the Opal API and open the web app with
                VITE_OPAL_API_URL set (see docs/evidence/shared-reality-closure/FOUNDER_LOCAL_REVIEW.md).
              </p>
            </div>
          ) : (
            <ActivationFlow
              onAuthenticated={(s) => {
                setSession(s);
                saveSession(s);
                setAuthReady(true);
                setLoadError(null);
                void refreshLive(s);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  // --- Authenticated member shell only after product session exists. ---
  const memberVisual = visualShellProps("member");
  return (
    <div
      className={`app app-futura ${memberVisual.className}`.trim()}
      aria-label="Opal"
      data-testid="member-shell"
      data-member-nav="true"
      data-visual-phase={memberVisual["data-visual-phase"]}
      data-technicolor={memberVisual["data-technicolor"]}
    >
      <div className="app-ambient" aria-hidden />
      <FindPeopleFlow
        open={findPeopleOpen}
        onClose={() => setFindPeopleOpen(false)}
        bearer={session?.access_token}
        onInvited={() => {
          void (async () => {
            try {
              const inv = await listIncoming(session?.access_token);
              setIncomingInvites(inv.invitations || []);
            } catch {
              /* ignore */
            }
          })();
        }}
      />

      <header className="topbar glass">
        <OpalLockup size="md" />
        <span className="session-pill" title="Authoritative session">
          {connectionState === "connected"
            ? "Live"
            : connectionState === "reconnecting" || connectionState === "connecting"
              ? "Reconnecting"
              : connectionState === "offline"
                ? "Offline"
                : "Live"}
        </span>
      </header>

      <main className="pane" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {loadError ? (
          <p className="activation-error" role="alert">
            {loadError}
          </p>
        ) : null}
        {tab === "home" ? (
          <HomePane
            needs={needs}
            onComplete={(id) => setNeeds((n) => n.filter((x) => x.id !== id))}
            onOpenChat={(id) => {
              if (id) void openChat(id);
              else setTab("chats");
            }}
            authenticated
            loading={loadingLive}
            signals={liveSignals}
          />
        ) : null}
        {tab === "chats" ? (
          <ChatsPane
            chats={chats}
            onOpen={(id) => void openChat(id)}
            authenticated
            loading={loadingLive}
            onFindPeople={() => setFindPeopleOpen(true)}
            incoming={incomingInvites}
            onAcceptInvite={async (id) => {
              if (!session) return;
              try {
                let cont: string | null = null;
                try {
                  cont = sessionStorage.getItem("opal_invite_continuation");
                } catch {
                  cont = null;
                }
                const res = await acceptInvitation(id, session.access_token, cont);
                try {
                  sessionStorage.removeItem("opal_invite_continuation");
                } catch {
                  /* ignore */
                }
                const moment = (res as { first_social_moment?: { body?: string } })
                  .first_social_moment?.body;
                if (moment) setSocialMoment(moment);
                const inv = await listIncoming(session.access_token);
                setIncomingInvites(inv.invitations || []);
                await refreshLive(session);
                if (res.establishment?.conversation_id) {
                  void openChat(res.establishment.conversation_id);
                }
              } catch (e) {
                setLoadError((e as Error).message || "Could not accept invitation");
              }
            }}
            socialMoment={socialMoment}
          />
        ) : null}
        {tab === "plans" ? (
          <PlansPane
            authenticated
            signals={liveSignals}
            onOpenChat={(id) => {
              if (id) void openChat(id);
              else setTab("chats");
            }}
          />
        ) : null}
        {tab === "you" ? (
          <YouPane
            onReplayIntro={() => setShowFirstRun(true)}
            session={session}
            onFindPeople={() => setFindPeopleOpen(true)}
            onSignOut={async () => {
              productRealtime.stop();
              // Continuation is ephemeral; never survive sign-out (D-002 / Real People).
              try {
                sessionStorage.removeItem("opal_invite_continuation");
              } catch {
                /* private mode */
              }
              if (session) {
                try {
                  await signOut(session.access_token);
                } catch {
                  saveSession(null);
                }
              }
              setSession(null);
              setChats([]);
              setThreads({});
              setNeeds([]);
              setConnectionState("offline");
            }}
          />
        ) : null}
      </main>

      <nav className="tabbar glass" aria-label="Primary" data-testid="member-tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? "active" : ""}`}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            <TabIcon id={t.id} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomePane({
  needs,
  onComplete,
  onOpenChat,
  authenticated,
  loading,
  signals,
}: {
  needs: NeedItem[];
  onComplete: (id: string) => void;
  onOpenChat: (id?: string) => void;
  authenticated?: boolean;
  loading?: boolean;
  signals?: ProductSignal[];
}) {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Coming up: durable shared realities only (not weak intention inventory).
  const comingUp = authenticated
    ? strongestPerConversation(signals || []).filter((s) => {
        if (!isDurableForPlans(s)) return false;
        // Only fully usable realities on Coming up — place gap stays out.
        if (s.shared_reality?.sufficiency === "usable") return true;
        if (s.shared_reality?.sufficiency === "converging") return false;
        return (
          s.lifecycle_stage === "set" ||
          s.lifecycle_stage === "ready" ||
          s.lifecycle_stage === "handled"
        );
      })
    : [];

  return (
    <div className="scroll">
      <h2 className="greeting">
        {greet}
        {authenticated ? null : (
          <>
            , <span className="greeting-name">friend</span>
          </>
        )}
      </h2>
      <p className="lede">{PRODUCT_COPY.tagline}</p>
      {loading ? <p className="empty">Loading…</p> : null}

      <section className="section">
        <h3 className="section-label">{PRODUCT_COPY.needsYouLabel}</h3>
        {needs.length === 0 ? (
          <p className="empty">{PRODUCT_COPY.emptyNeedsYou}</p>
        ) : (
          needs.map((n) => (
            <article key={n.id} className="card action-card lumen-card">
              <h4>{n.title}</h4>
              <p>{n.detail}</p>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => onOpenChat(n.chatId)}
                >
                  Open chat
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onComplete(n.id)}
                >
                  Done
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="section">
        <h3 className="section-label">{PRODUCT_COPY.comingUpLabel}</h3>
        {authenticated ? (
          comingUp.length === 0 ? (
            <p className="empty">Nothing locked in yet.</p>
          ) : (
            comingUp.map((s, i) => (
              <button
                key={s.conversation_id || i}
                type="button"
                className="card lumen-card plan-card-btn"
                data-testid="coming-up-card"
                onClick={() => onOpenChat(s.conversation_id)}
              >
                <h4>{surfaceLabel(s)}</h4>
                <p>{signalDetail(s) || "From conversation"}</p>
              </button>
            ))
          )
        ) : (
          PLANS.filter((p) => p.status !== "needs_you").map((p) => (
            <button
              key={p.id}
              type="button"
              className="card lumen-card plan-card-btn"
              onClick={() => onOpenChat(p.chatId)}
            >
              <h4>{p.title}</h4>
              <p>
                {p.when}
                {p.where ? (
                  <>
                    <span className="dot">·</span>
                    {p.where}
                  </>
                ) : null}
                <span className="dot">·</span>
                {p.who}
              </p>
            </button>
          ))
        )}
      </section>
    </div>
  );
}

function ChatsPane({
  chats,
  onOpen,
  authenticated,
  loading,
  onFindPeople,
  incoming,
  onAcceptInvite,
  socialMoment,
}: {
  chats: ChatPreview[];
  onOpen: (id: string) => void;
  authenticated?: boolean;
  loading?: boolean;
  onFindPeople?: () => void;
  incoming?: { id: string }[];
  onAcceptInvite?: (id: string) => void | Promise<void>;
  socialMoment?: string | null;
}) {
  return (
    <div className="scroll">
      <h2 className="screen-title">Chats</h2>
      {socialMoment ? (
        <div className="opal-moment row" role="status" data-testid="first-social-moment">
          <span className="opal-moment-mark" aria-hidden>
            ◈
          </span>
          <span className="opal-moment-label">{socialMoment}</span>
        </div>
      ) : null}
      {authenticated && incoming && incoming.length > 0 ? (
        <section className="section" aria-label="Invitations">
          <h3 className="section-label">New invitation</h3>
          {incoming.map((inv) => (
            <article key={inv.id} className="card lumen-card">
              <p>Someone invited you to connect.</p>
              <button
                type="button"
                className="btn primary"
                onClick={() => void onAcceptInvite?.(inv.id)}
              >
                Accept
              </button>
            </article>
          ))}
        </section>
      ) : null}
      {loading ? <p className="empty">Loading conversations…</p> : null}
      {!loading && chats.length === 0 ? (
        <div className="empty-people" data-testid="empty-people">
          <p className="empty-title">Your people will show up here</p>
          <p className="empty">
            {authenticated
              ? "Invite someone you know to begin."
              : PRODUCT_COPY.emptyChats}
          </p>
          {authenticated ? (
            <div className="find-people-actions">
              <button type="button" className="btn primary" onClick={onFindPeople}>
                Find people you know
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {authenticated && !loading && chats.length > 0 ? (
        <div className="find-people-actions compact">
          <button type="button" className="btn ghost" onClick={onFindPeople}>
            Invite someone
          </button>
        </div>
      ) : null}
      {!loading && chats.length > 0 ? (
        <ul className="chat-list">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="chat-row lumen-row"
                onClick={() => onOpen(c.id)}
              >
                <div className="avatar avatar-lumen" aria-hidden>
                  {initials(c.name)}
                </div>
                <div className="chat-meta">
                  <div className="chat-top">
                    <span className="chat-name">{c.name}</span>
                    <time className="chat-time">{c.time}</time>
                  </div>
                  <div className="chat-bottom">
                    <span className={`chat-preview ${c.unread ? "unread" : ""}`}>
                      {c.preview}
                    </span>
                    {c.unread ? (
                      <span className="badge-count" aria-label={`${c.unread} unread`}>
                        {c.unread}
                      </span>
                    ) : null}
                  </div>
                  {c.signalLabel ? (
                    <div
                      className={`opal-moment row signal-${c.signal ?? "moment"}`}
                      data-testid="list-journey-signal"
                      data-state={semanticStateForSignal(c.signal ?? "moment")}
                    >
                      <span className="opal-moment-mark" aria-hidden>
                        ◈
                      </span>
                      <span className="opal-moment-label">{c.signalLabel}</span>
                    </div>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PlansPane({
  authenticated,
  signals,
  onOpenChat,
}: {
  authenticated?: boolean;
  signals?: ProductSignal[];
  onOpenChat?: (id?: string) => void;
}) {
  const groups = [
    { key: "needs_you" as const, label: "Needs confirmation" },
    { key: "today" as const, label: "Today" },
    { key: "upcoming" as const, label: "Upcoming" },
  ];

  // Plans surface law: usable + strongly converging only — not every thought.
  // Set without place (sufficiency converging) is NOT "Shared" — it is Coming together.
  const durable = strongestPerConversation(signals || []).filter(isDurableForPlans);
  const usable = durable.filter((s) => {
    const suf = s.shared_reality?.sufficiency;
    if (suf === "usable") return true;
    if (suf === "converging" || suf === "intention") return false;
    // Legacy signals without presentation payload
    return (
      s.lifecycle_stage === "set" ||
      s.lifecycle_stage === "ready" ||
      s.lifecycle_stage === "handled"
    );
  });
  const converging = durable.filter((s) => !usable.includes(s));

  return (
    <div className="scroll">
      <h2 className="screen-title">Plans</h2>
      <p className="lede muted-lede">
        {authenticated
          ? "What you can actually count on — and what is almost there."
          : PRODUCT_COPY.emptyPlans}
      </p>
      {authenticated && usable.length > 0 ? (
        <section className="section">
          <h3 className="section-label">Shared</h3>
          {usable.map((s, i) => (
              <button
                key={s.conversation_id || i}
                type="button"
                className="card lumen-card plan-card-btn"
                data-testid="plan-shared-card"
                onClick={() => onOpenChat?.(s.conversation_id)}
              >
                <h4 className="plan-title">{surfaceLabel(s)}</h4>
                <p className="plan-detail">
                  {signalDetail(s) || s.evidence_preview || "From conversation"}
                </p>
              </button>
            ))}
        </section>
      ) : null}
      {authenticated && converging.length > 0 ? (
        <section className="section">
          <h3 className="section-label">Coming together</h3>
          {converging.map((s, i) => {
            return (
              <button
                key={s.conversation_id || `c-${i}`}
                type="button"
                className="card lumen-card plan-card-btn"
                data-testid="plan-converging-card"
                onClick={() => onOpenChat?.(s.conversation_id)}
              >
                <h4 className="plan-title">{surfaceLabel(s)}</h4>
                <p className="plan-detail">
                  {signalDetail(s) || s.evidence_preview || "One more step"}
                </p>
              </button>
            );
          })}
        </section>
      ) : null}
      {!authenticated
        ? groups.map((g) => {
            const items = PLANS.filter((p) => p.status === g.key);
            if (!items.length) return null;
            return (
              <section key={g.key} className="section">
                <h3 className="section-label">{g.label}</h3>
                {items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="card lumen-card plan-card-btn"
                    onClick={() => onOpenChat?.(p.chatId)}
                  >
                    <h4>{p.title}</h4>
                    <p>
                      {p.when}
                      {p.where ? (
                        <>
                          <span className="dot">·</span>
                          {p.where}
                        </>
                      ) : null}
                      <span className="dot">·</span>
                      {p.who}
                    </p>
                  </button>
                ))}
              </section>
            );
          })
        : null}
      {authenticated && durable.length === 0 ? (
        <p className="empty">Nothing firm enough to count on yet.</p>
      ) : null}
    </div>
  );
}

function YouPane({
  onReplayIntro,
  session,
  onSignOut,
  onFindPeople,
}: {
  onReplayIntro: () => void;
  session: ProductSession | null;
  onSignOut: () => void | Promise<void>;
  onFindPeople?: () => void;
}) {
  return (
    <div className="scroll">
      <h2 className="screen-title">You</h2>
      <article className="card profile-card lumen-card">
        <div className="avatar lg avatar-lumen" aria-hidden>
          {session?.display_name
            ? session.display_name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("")
            : "?"}
        </div>
        <div>
          <h4>{session?.display_name || "Guest"}</h4>
          <p>{session ? "Signed in · private by design" : "Not signed in"}</p>
        </div>
      </article>
      <section className="section">
        {session ? (
          <button type="button" className="settings-row" onClick={onFindPeople}>
            <span>People you know</span>
            <span className="muted">Invite</span>
          </button>
        ) : null}
        <button type="button" className="settings-row" onClick={onReplayIntro}>
          <span>{PRODUCT_COPY.replayIntro}</span>
          <OpalMark size="sm" title="" glow={false} />
        </button>
        <button type="button" className="settings-row">
          <span>Devices</span>
          <span className="muted">This browser</span>
        </button>
        <button type="button" className="settings-row">
          <span>Privacy</span>
          <span className="muted">Messages stay private</span>
        </button>
        {session ? (
          <button
            type="button"
            className="settings-row"
            data-testid="sign-out"
            onClick={() => void onSignOut()}
          >
            <span>Sign out</span>
            <span className="muted">End this session</span>
          </button>
        ) : null}
      </section>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 2L11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 2L15 22l-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TabIcon({ id }: { id: Tab }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true as const,
  };
  if (id === "home") {
    return (
      <svg {...common}>
        <path
          d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === "chats") {
    return (
      <svg {...common}>
        <path
          d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.2A8 8 0 1 1 21 12z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === "plans") {
    return (
      <svg {...common}>
        <rect
          x="4"
          y="5"
          width="16"
          height="15"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
