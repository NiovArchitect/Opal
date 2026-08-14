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
import {
  buildPlaceShareDraft,
  buildTimeShareDraft,
  deriveSocialReality,
  formatDistanceMinutes,
  formatLeaveAround,
} from "./opalUi/socialReality";
import {
  composePlaceOptions,
  defaultPlaceCandidates,
} from "./opalUi/placeComposition";
import { SocialMomentCard } from "./opalUi/SocialMomentCard";
import { ContextChip } from "./opalUi/ContextChip";
import { PrivateGuidance } from "./opalUi/PrivateGuidance";
import { OpalInsightField } from "./opalUi/OpalInsightField";
import { OpalResolution } from "./opalUi/OpalResolution";
import {
  AwakenSurface,
  OpalFilament,
  PresenceSurface,
  PrivateOpalPlate,
  V2AmbientField,
  V2BrandRow,
  type FilamentMode,
  type PresenceEnergy,
} from "./opalUi/v2Primitives";
import {
  formatHumanTime,
  isConsequentialNeed,
  isDurableForPlans,
  isUsableReality,
  presenceLines,
  signalDetail,
  strongestPerConversation,
  strongestPerHomePresence,
  surfaceLabel,
} from "./sharedReality";
import { isRedundantFilamentLabel } from "./opalUi/composeHumanReality";

type Tab = "home" | "chats" | "plans" | "you";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "chats", label: "People" },
  { id: "plans", label: "Plans" },
  { id: "you", label: "You" },
];

/** Map durable chronology / signal kinds → filament visual mode. */
function filamentModeFor(kind?: string): FilamentMode {
  if (!kind) return "awaken";
  if (
    kind === "set" ||
    kind === "ready" ||
    kind === "follow_through" ||
    kind === "handled"
  ) {
    return "transform";
  }
  return "awaken";
}

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

/** Only surface sustained outage - not transient reconnect thrash. */
function ConnectionHint({ state }: { state: ConnectionState }) {
  if (state === "connected" || state === "offline" || state === "connecting") {
    return null;
  }
  const label =
    state === "reconnecting"
      ? "Trying to reconnect…"
      : state === "session_expired"
        ? "Sign in again"
        : state === "failed"
          ? "Connection issue"
          : null;
  if (!label) return null;
  return (
    <div className="connection-hint-sustained" role="status" aria-live="polite">
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

/** Opal product shell: V2 Living Void  -  social field first, identity-forward. */
export function OpalApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [curateOpen, setCurateOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  /** Private Extend selection — never auto-messages peers. */
  const [extendSelected, setExtendSelected] = useState<{
    id: string;
    title: string;
    detail: string;
  } | null>(null);
  const [curateAccepted, setCurateAccepted] = useState(false);
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
  const [findPlaceOpen, setFindPlaceOpen] = useState(false);

  // Escape collapses disclosure panels without side effects.
  useEffect(() => {
    if (!extendOpen && !curateOpen && !findPlaceOpen && !findTimeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setExtendOpen(false);
      setExtendSelected(null);
      setCurateOpen(false);
      setFindPlaceOpen(false);
      setFindTimeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [extendOpen, curateOpen, findPlaceOpen, findTimeOpen]);
  const [availabilityOverlap, setAvailabilityOverlap] =
    useState<AvailabilityOverlap | null>(null);
  const [showFindTimeHint, setShowFindTimeHint] = useState(false);
  const [overlapExpanded, setOverlapExpanded] = useState(false);
  const [privateDismissed, setPrivateDismissed] = useState<Set<string>>(
    () => readPrivateDismissed(),
  );
  /** Owner has at least one private window  -  drives proactive private nudge. */
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
    const chat = chats.find((c) => c.id === activeChatId);
    const kind = chat?.signal;
    const convSignal =
      liveSignals.find((s) => s.conversation_id === activeChatId) || null;
    const primary = resolvePrimaryOpalSurface({
      signalKind: kind,
      overlap: availabilityOverlap,
      findTimeOpen,
      findPlaceOpen,
      hasPrivateWindows,
      privateDismissed,
      signal: convSignal,
    });
    if (primary.kind !== "chip" || !primary.withEdge) return;
    const key = `${activeChatId}:chip:${kind ?? "none"}:${primary.gap ?? "x"}`;
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
    findPlaceOpen,
    hasPrivateWindows,
    privateDismissed,
    liveSignals,
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
        // Group = multi-party composition; dyad peers list is the other person only.
        const isGroup =
          c.composition === "group" || (c.member_count ?? 0) >= 3;
        const homePeerKey = isGroup
          ? `group:${c.id}`
          : c.peers[0]?.id || `solo:${c.id}`;
        return {
          id: c.id,
          name: c.title,
          preview: c.preview || "No messages yet",
          time: formatHumanTime(c.updated_at),
          // Peer context only  -  never put journey signals under a person's name.
          contextLine: c.peers.map((p) => p.display_name).join(", ") || undefined,
          // Human shared reality  -  never raw stage tokens like "Set".
          signalLabel: surfaceLabel(sig),
          signal: mapSignalKind(sig?.kind || sig?.lifecycle_stage),
          homePeerKey,
        };
      });
      setChats(mapped);
      setLiveSignals(data.signals || []);
      // Needs you: one awaken — compressed presentation, not full headline thrice.
      const peerKeyByConv = new Map(
        mapped.map((c) => [c.id, c.homePeerKey || c.id] as const),
      );
      const homeStrong = strongestPerHomePresence(data.signals || [], peerKeyByConv);
      setNeeds(
        homeStrong
          .filter(isConsequentialNeed)
          .slice(0, 1)
          .map((sig, i) => {
            const lines = presenceLines(sig);
            const chat = mapped.find((c) => c.id === sig.conversation_id);
            const rawName = chat?.name || "Someone";
            // Never dump multi-peer titles into awaken meta (Figma 2:2 quiet field).
            const who =
              chat?.homePeerKey?.startsWith("group:") || rawName.includes(",")
                ? "Friends"
                : rawName.split(",")[0]?.trim() || rawName;
            const placeOpen =
              !!lines.gap && /place|where|choos/i.test(lines.gap);
            // Awaken asks the unresolved decision; meta = who · compact when once.
            const title = placeOpen
              ? "Where should dinner be?"
              : lines.title || surfaceLabel(sig) || "Needs a decision";
            // Prefer compressed presenceDetail (when · place/gap) — not peer list.
            const metaDetail = placeOpen
              ? lines.detail || ""
              : lines.gap || lines.detail || "";
            return {
              id: `sig-${i}`,
              title,
              detail: [who, metaDetail].filter(Boolean).join(" · "),
              chatId: sig.conversation_id,
            };
          }),
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
  // Never leave "Preparing…" forever  -  session/list hangs must surface recovery.
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
  // Do not depend on chat selection  -  restarting the socket on every open thrashs reconnects.
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
    // Proof harness only: expose diagnostics (not intelligence). Pass 7 soak reads this.
    if (typeof window !== "undefined") {
      (window as unknown as { __opalProductRealtime?: typeof productRealtime }).__opalProductRealtime =
        productRealtime;
    }
    return () => {
      offMsg();
      offState();
      offAv();
      productRealtime.stop();
      if (typeof window !== "undefined") {
        delete (window as unknown as { __opalProductRealtime?: unknown }).__opalProductRealtime;
      }
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
    // Clear prior join-deny / load banners so late membership re-open can succeed.
    setLoadError(null);
    setActiveChatId(id);
    setAvailabilityOverlap(null);
    setAvailabilityIntervention(null);
    setFindTimeOpen(false);
    setFindPlaceOpen(false);
    setCurateOpen(false);
    setExtendOpen(false);
    setExtendSelected(null);
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
        // Durable Opal chronology first (survives refresh/logout), then
        // recompute moments as fallback. Interleave after triggering human msg.
        const primaryForMoments =
          strongestPerConversation(
            (data.signals || []).map((s) => ({ ...s, conversation_id: id })),
          )[0] || data.signals?.[0];
        type ChronoMoment = {
          lifecycle_stage?: string;
          kind?: string;
          label?: string;
          detail?: string;
          evidence_message_id?: string;
          after_server_seq?: number;
          source_message_ids?: string[];
          durable?: boolean;
          privacy_class?: string;
          visibility?: string;
        };
        const durableChrono: ChronoMoment[] = Array.isArray(
          (data as { chronology?: ChronoMoment[] }).chronology,
        )
          ? ((data as { chronology: ChronoMoment[] }).chronology || [])
          : [];
        const recomputeChrono: ChronoMoment[] =
          (primaryForMoments as { chronological_moments?: ChronoMoment[] } | undefined)
            ?.chronological_moments ||
          (data.signals || [])
            .filter((s) => s.kind !== "proposal")
            .slice(0, 8)
            .map((s) => ({
              lifecycle_stage: s.lifecycle_stage,
              kind: s.kind,
              label: surfaceLabel(s) || signalDetail(s) || s.label,
              evidence_message_id: (s as { evidence_message_id?: string }).evidence_message_id,
              after_server_seq: (s as { evidence_server_seq?: number }).evidence_server_seq,
              source_message_ids: (s as { source_message_ids?: string[] }).source_message_ids,
            }));
        // Prefer durable history; fill gaps from recompute without duplicating labels+seq.
        const rawChrono: ChronoMoment[] =
          durableChrono.length > 0
            ? durableChrono
            : recomputeChrono;
        // Collapse redundant same-dimension filaments (Dinner · Thursday thrice).
        const chrono: ChronoMoment[] = [];
        for (const mom of rawChrono) {
          const prev = chrono[chrono.length - 1];
          if (
            prev &&
            isRedundantFilamentLabel(prev.label, mom.label)
          ) {
            continue;
          }
          chrono.push(mom);
        }

        const humanOnly = mapped.filter((m) => !m.id.startsWith("opal-filament-"));
        const interleaved: Message[] = [];
        const usedMomentIdx = new Set<number>();
        let lastFilamentLabel: string | null = null;

        for (const hm of humanOnly) {
          interleaved.push(hm);
          chrono.forEach((mom, mi) => {
            if (usedMomentIdx.has(mi)) return;
            const afterSeq = mom.after_server_seq;
            const evidId = mom.evidence_message_id;
            const matches =
              (typeof afterSeq === "number" && hm.serverSeq === afterSeq) ||
              (evidId && hm.id === evidId);
            if (!matches) return;
            usedMomentIdx.add(mi);
            const label = mom.label || "Something is forming";
            if (isRedundantFilamentLabel(lastFilamentLabel, label)) return;
            lastFilamentLabel = label;
            const isPrivate =
              mom.privacy_class === "private_viewer" ||
              mom.visibility === "private_viewer";
            interleaved.push({
              id: `opal-filament-${id}-${mi}-${mom.lifecycle_stage || mom.kind || "m"}`,
              from: "them",
              body: mom.detail ? `${label} · ${mom.detail}` : label,
              time: hm.time || "",
              serverSeq: (hm.serverSeq ?? 0) + 0.01 * (mi + 1),
              opalFilament: true,
              opalPrivate: Boolean(isPrivate),
              signal: {
                kind:
                  mapSignalKind(mom.kind || mom.lifecycle_stage) ||
                  ("plan_forming" as const),
                label,
              },
            });
          });
        }
        // Unmatched moments (missing seq) still visible but marked — never invent chronology.
        chrono.forEach((mom, mi) => {
          if (usedMomentIdx.has(mi)) return;
          const label = mom.label || "Something is forming";
          if (isRedundantFilamentLabel(lastFilamentLabel, label)) return;
          lastFilamentLabel = label;
          interleaved.push({
            id: `opal-filament-${id}-tail-${mi}-${mom.lifecycle_stage || mom.kind || "m"}`,
            from: "them",
            body: label,
            time: "",
            opalFilament: true,
            opalPrivate: false,
            signal: {
              kind:
                mapSignalKind(mom.kind || mom.lifecycle_stage) ||
                ("plan_forming" as const),
              label,
            },
          });
        });

        if (interleaved.length) {
          setThreads((prev) => ({ ...prev, [id]: interleaved }));
        }

        if (primary) {
          // Continuity: keep liveSignals structured shared_reality for this conversation
          // so deriveSocialReality does not fall back to label-only inference mid-chat.
          const withConv = {
            ...primary,
            conversation_id: id,
          } as ProductSignal;
          setLiveSignals((prev) => {
            const others = prev.filter((s) => s.conversation_id !== id);
            return [...others, withConv];
          });
          setChats((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    signalLabel: surfaceLabel(primary),
                    signal: mapSignalKind(primary.kind || primary.lifecycle_stage),
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
      } else if (join === "ok") {
        setLoadError(null);
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
    // Whole-picture reality — not a linear "share time" journey owner.
    const convSignal =
      liveSignals.find((s) => s.conversation_id === activeChatId) ||
      (activeChat.signal
        ? ({
            kind: activeChat.signal,
            label: activeChat.signalLabel || "",
            status: "forming",
            conversation_id: activeChatId || undefined,
            lifecycle_stage:
              activeChat.signal === "set" || activeChat.signal === "ready"
                ? "set"
                : activeChat.signal === "open_loop"
                  ? "still_open"
                  : "plan_forming",
            shared_reality: undefined,
          } as ProductSignal)
        : null);
    const reality = deriveSocialReality(convSignal);
    // ONE meaningful Opal surface — gap-driven, never stale time mode.
    const primary = resolvePrimaryOpalSurface({
      signalKind: activeChat.signal,
      overlap: availabilityOverlap,
      findTimeOpen,
      findPlaceOpen,
      hasPrivateWindows,
      privateDismissed,
      overlapExpanded,
      intervention: availabilityIntervention,
      signal: convSignal,
    });
    const composerHasOpal =
      primary.kind === "chip" || primary.kind === "private";
    const chipEdgeKey = `${activeChatId ?? ""}:chip:${activeChat.signal ?? "none"}:${primary.kind === "chip" ? primary.gap ?? "x" : "x"}`;
    const animateChipEdge =
      primary.kind === "chip" &&
      primary.withEdge &&
      edgeAnimateKey === chipEdgeKey;

    const openGapSurface = (opens?: string, gap?: string) => {
      // Reproject: open the sheet that matches the gap, never force time.
      if (opens === "place_sheet" || gap === "place") {
        setFindPlaceOpen(true);
        setFindTimeOpen(false);
        setCurateOpen(false);
        return;
      }
      if (opens === "curate") {
        setCurateOpen(true);
        setFindTimeOpen(false);
        setFindPlaceOpen(false);
        return;
      }
      if (opens === "time_sheet" || gap === "time" || !opens) {
        setFindTimeOpen(true);
        setFindPlaceOpen(false);
        setShowFindTimeHint(false);
        try {
          localStorage.setItem(`${FIND_TIME_HINT_KEY}:${activeChatId}`, "1");
        } catch {
          /* private mode */
        }
      }
    };

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
            <div className="chat-header-sub" data-testid="chat-context">
              {activeChat.signalLabel
                ? activeChat.signalLabel
                : activeChat.contextLine
                  ? activeChat.contextLine
                  : `with ${activeChat.name}`}
            </div>
            <ConnectionHint state={connectionState} />
          </div>
        </header>

        {/* Next / Last together  -  thin reality shortcut, not a second database. */}
        {activeChat.signalLabel ? (
          <button
            type="button"
            className="next-together-strip"
            data-testid="next-together"
            onClick={() => {
              document
                .querySelector('[data-testid="opal-moment"], .opal-resolution, .thread')
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <span className="next-together-kicker">{PRODUCT_COPY.nextTogether}</span>
            <span className="next-together-line">{activeChat.signalLabel}</span>
          </button>
        ) : null}

        {/* Signature Shared Reality object (Figma 4:2) — domain content, not sample Chanelle. */}
        {primary.kind === "set" ? (
          <OpalResolution
            detail={activeChat.signalLabel || null}
            reality={(() => {
              const convSig =
                strongestPerConversation(
                  liveSignals.filter((s) => s.conversation_id === activeChatId),
                )[0] || liveSignals.find((s) => s.conversation_id === activeChatId);
              const sr = convSig?.shared_reality as
                | {
                    what?: string;
                    when?: string;
                    where?: string;
                    headline?: string;
                    area?: string;
                    distance?: string;
                    leave_around?: string;
                    leave_by?: string;
                    travel_estimate?: string;
                    travel_minutes?: number;
                  }
                | undefined;
              const travelMinutes =
                typeof (sr as { travel_minutes?: number })?.travel_minutes ===
                "number"
                  ? (sr as { travel_minutes?: number }).travel_minutes
                  : null;
              const startIso =
                typeof (sr as { start_at?: string })?.start_at === "string"
                  ? (sr as { start_at?: string }).start_at
                  : null;
              const leaveAround =
                typeof sr?.leave_around === "string"
                  ? sr.leave_around
                  : typeof sr?.leave_by === "string"
                    ? // leave_by may be ISO - reformat if so
                      formatLeaveAround(sr.leave_by, travelMinutes ?? 0) ||
                      sr.leave_by
                    : formatLeaveAround(startIso, travelMinutes);
              const distance =
                typeof sr?.distance === "string"
                  ? sr.distance
                  : typeof sr?.travel_estimate === "string"
                    ? sr.travel_estimate
                    : formatDistanceMinutes(travelMinutes);
              // Only pass travel fields when domain provided them - never invent.
              return {
                headline: activeChat.signalLabel || sr?.headline || sr?.what || null,
                what: sr?.what || null,
                who: activeChat.name || null,
                when: sr?.when || null,
                where: sr?.where || null,
                area: typeof sr?.area === "string" ? sr.area : null,
                distance,
                leaveAround,
                gap:
                  Array.isArray((sr as { gaps?: string[] })?.gaps) &&
                  (sr as { gaps?: string[] }).gaps?.includes("where")
                    ? PRODUCT_COPY.placeStillOpen
                    : null,
              };
            })()}
          />
        ) : null}

        {RELATIONSHIP_PULSE_EXPERIMENT && primary.kind === "chip" ? (
          <div
            className="opal-pulse-experiment"
            data-testid="relationship-pulse-experiment"
            aria-hidden
          />
        ) : null}

        <div className="thread" role="log" aria-live="polite">
          {messages.map((m) =>
            m.opalFilament || m.id.startsWith("opal-filament-") ? (
              m.opalPrivate ? (
                <PrivateOpalPlate
                  key={m.id}
                  body={m.signal?.label || m.body}
                  time={m.time}
                />
              ) : (
                <OpalFilament
                  key={m.id}
                  mode={filamentModeFor(m.signal?.kind)}
                  label={m.signal?.label || m.body}
                  time={m.time}
                  signalKind={m.signal?.kind}
                />
              )
            ) : (
              <div
                key={m.id}
                className={`bubble-row ${m.from === "me" ? "out" : "in"}`}
              >
                <div className={`bubble ${m.from === "me" ? "out" : "in"}`}>
                  <p>{m.body}</p>
                  <time>{m.time}</time>
                </div>
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
            ),
          )}

          {/* Gap-driven chip: Find a time OR Choose a place — never stale time when place is next */}
          {primary.kind === "chip" ? (
            <div
              className={`opal-context-chip-wrap${
                primary.withEdge ? " opal-chip-edge" : ""
              }${animateChipEdge ? " opal-edge-animate" : ""}`}
              data-gap={primary.gap || "unknown"}
              data-testid="opal-gap-chip"
            >
              <ContextChip
                label={primary.label}
                onClick={() => openGapSurface(primary.opens, primary.gap)}
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
                      // Only open time sheet when TIME is the gap
                      if (reality.next_gap === "place") {
                        openGapSurface("place_sheet", "place");
                        return;
                      }
                      openGapSurface("time_sheet", "time");
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
                    // Time share only — never place settlement
                    const t = buildTimeShareDraft(opt.label);
                    setDraft(t.text);
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

        {primary.kind === "sheet" &&
        primary.sheetKind !== "place" &&
        activeChatId ? (
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

        {/* Place sheet — FIRST-CLASS. Share place never serializes time-only payloads. */}
        {(findPlaceOpen ||
          (primary.kind === "sheet" && primary.sheetKind === "place")) &&
        activeChatId ? (
          <section
            className="place-sheet private-opal-plate"
            data-testid="place-sheet"
            data-share-kind="place"
            aria-label="Choose a place"
          >
            <p className="private-opal-kicker">{PRODUCT_COPY.onlyYou}</p>
            <p className="curate-kicker">{PRODUCT_COPY.choosePlace}</p>
            <p className="curate-truth">
              {reality.when
                ? `${reality.what || "Plans"} · ${reality.when}`
                : PRODUCT_COPY.placeSheetLead}
            </p>
            {/* Carry presentation category/preference residue into private place UI */}
            <p className="presence-detail">
              {(convSignal?.shared_reality as { place_gap_label?: string } | undefined)
                ?.place_gap_label || PRODUCT_COPY.placeSheetLead}
            </p>
            <ul className="extend-options" data-testid="place-options">
              {(
                (() => {
                  // Server collective_fit is authoritative when present — client does not re-rank.
                  const cf = (
                    convSignal as {
                      collective_fit?: {
                        abstain?: boolean;
                        options?: Array<{
                          id?: string;
                          name?: string;
                          area?: string;
                          tag?: string;
                        }>;
                      };
                    } | null
                  )?.collective_fit;
                  if (cf?.abstain) return [];
                  if (cf?.options && cf.options.length > 0) {
                    return cf.options.map((o, i) => {
                      const name = o.name || "Place";
                      // Stable UI ids for fixture/live tests + place-option-* selectors
                      const id =
                        /juniper/i.test(name) || o.id === "juniper_ivy"
                          ? "juniper"
                          : /harbor/i.test(name) || o.id === "harbor_table"
                            ? "harbor"
                            : /campfire/i.test(name) || o.id === "campfire"
                              ? "campfire"
                              : o.id || `cf-${i}`;
                      return {
                        id,
                        name,
                        area: o.area || o.tag || "",
                      };
                    });
                  }
                  // Fallback: client composition only when server options absent (dyad thin path)
                  const gapLbl =
                    (convSignal?.shared_reality as { place_gap_label?: string } | undefined)
                      ?.place_gap_label || "";
                  const threadBodies = (threads[activeChatId || ""] || [])
                    .filter((m) => !m.opalFilament)
                    .map((m) => m.body)
                    .join(" ");
                  const composed = composePlaceOptions({
                    candidates: defaultPlaceCandidates(),
                    placeGapLabel: gapLbl,
                    threadText: threadBodies,
                    whereKnown: Boolean(reality.where),
                  });
                  return composed.ranked.length
                    ? composed.ranked
                    : defaultPlaceCandidates();
                })()
              ).map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className="extend-option"
                    data-testid={`place-option-${opt.id}`}
                    data-share-kind="place"
                    onClick={() => {
                      // PRIVATE select — no auto peer message.
                      // Explicit share drafts PLACE content only.
                      const draftPayload = buildPlaceShareDraft({
                        name: opt.name,
                        area: opt.area,
                      });
                      // Assert contract: never time windows
                      if (
                        "windows" in draftPayload ||
                        "display_start" in draftPayload
                      ) {
                        return;
                      }
                      setDraft(draftPayload.text);
                      setFindPlaceOpen(false);
                      document.getElementById("composer-input")?.focus();
                    }}
                  >
                    <span className="presence-title">{opt.name}</span>
                    <span className="presence-detail">{opt.area}</span>
                  </button>
                </li>
              ))}
            </ul>
            {(
              convSignal as { collective_fit?: { abstain?: boolean; one_question?: { text?: string } | null; human_surface?: { label?: string } } } | null
            )?.collective_fit?.abstain ? (
              <p className="presence-detail" data-testid="collective-abstain">
                {(
                  convSignal as { collective_fit?: { human_surface?: { label?: string } } }
                )?.collective_fit?.human_surface?.label ||
                  "None of these fit everyone well."}
              </p>
            ) : null}
            {(
              convSignal as { collective_fit?: { one_question?: { text?: string } | null } } | null
            )?.collective_fit?.one_question?.text ? (
              <p className="presence-detail" data-testid="collective-one-question">
                {
                  (
                    convSignal as { collective_fit?: { one_question?: { text?: string } } }
                  ).collective_fit!.one_question!.text
                }
              </p>
            ) : null}
            <div className="row-actions">
              <button
                type="button"
                className="btn ghost"
                data-testid="place-sheet-close"
                onClick={() => setFindPlaceOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn ghost"
                data-testid="place-curate-instead"
                onClick={() => {
                  setFindPlaceOpen(false);
                  setCurateOpen(true);
                }}
              >
                Curate a place
              </button>
            </div>
          </section>
        ) : null}

        {/* Journey CTAs: ONE primary for next_gap. Chip already owns place/time when kind=chip. */}
        <div
          className="journey-cta-row"
          data-testid="journey-cta-row"
          data-next-gap={reality.next_gap}
        >
          {/* Place gap: chip is primary; journey row only if chip not already place CTA */}
          {reality.next_gap === "place" &&
          primary.kind !== "chip" &&
          primary.kind !== "sheet" ? (
            <button
              type="button"
              className="btn journey-cta"
              data-testid="curate-cta"
              data-gap="place"
              aria-expanded={findPlaceOpen || curateOpen}
              onClick={() => {
                setFindPlaceOpen(true);
                setCurateOpen(false);
                setExtendOpen(false);
                setExtendSelected(null);
                setFindTimeOpen(false);
              }}
            >
              {PRODUCT_COPY.choosePlace}
            </button>
          ) : null}
          {/* Optional curate alternate — different job, never second "Choose a place" */}
          {reality.next_gap === "place" &&
          (primary.kind === "chip" || primary.kind === "sheet") &&
          !findPlaceOpen ? (
            <button
              type="button"
              className="btn journey-cta ghost"
              data-testid="curate-cta"
              data-gap="place"
              aria-expanded={curateOpen}
              onClick={() => {
                setCurateOpen((open) => !open);
                setFindPlaceOpen(false);
                setExtendOpen(false);
                setExtendSelected(null);
                setFindTimeOpen(false);
              }}
            >
              {PRODUCT_COPY.curateCta}
            </button>
          ) : null}
          {reality.next_gap === "activity" ? (
            <button
              type="button"
              className="btn journey-cta"
              data-testid="curate-cta"
              data-gap="activity"
              aria-expanded={curateOpen}
              onClick={() => {
                setCurateOpen((open) => !open);
                setFindPlaceOpen(false);
                setExtendOpen(false);
                setFindTimeOpen(false);
              }}
            >
              {PRODUCT_COPY.curateCta}
            </button>
          ) : null}
          {reality.next_gap === "time" &&
          primary.kind !== "chip" &&
          primary.kind !== "sheet" ? (
            <button
              type="button"
              className="btn journey-cta"
              data-testid="find-time-cta"
              data-gap="time"
              onClick={() => openGapSurface("time_sheet", "time")}
            >
              {PRODUCT_COPY.findTime}
            </button>
          ) : null}
          {(primary.kind === "set" ||
            activeChat.signal === "set" ||
            activeChat.signal === "ready") &&
          reality.next_gap === "none" ? (
            <button
              type="button"
              className="btn journey-cta ghost"
              data-testid="extend-cta"
              aria-expanded={extendOpen}
              onClick={() => {
                setExtendOpen((open) => {
                  if (open) setExtendSelected(null);
                  return !open;
                });
                setCurateOpen(false);
                setFindPlaceOpen(false);
              }}
            >
              {PRODUCT_COPY.extendCta}
            </button>
          ) : null}
        </div>

        {curateOpen ? (
          <section
            className="curate-panel figma-curate"
            data-testid="curate-panel"
            aria-label="Curated evening"
            data-node-ref="4:11"
          >
            <div className="curate-orbs" aria-hidden />
            <h2 className="curate-headline">
              I&apos;ve got
              <br />
              your evening.
            </h2>
            <p className="curate-arc">
              {(() => {
                const cf = (
                  convSignal as {
                    collective_fit?: {
                      abstain?: boolean;
                      human_surface?: { label?: string };
                      options?: Array<{ name?: string }>;
                    };
                  } | null
                )?.collective_fit;
                if (cf?.abstain) {
                  return (
                    cf.human_surface?.label ||
                    "None of these fit everyone well."
                  );
                }
                const topName = cf?.options?.[0]?.name;
                if (reality.when && topName) {
                  return `${reality.what || "Dinner"} · ${reality.when} · ${topName}`;
                }
                if (cf?.human_surface?.label) return cf.human_surface.label;
                // Fallback only when server collective_fit absent
                const gapLbl =
                  (convSignal?.shared_reality as { place_gap_label?: string } | undefined)
                    ?.place_gap_label || "";
                const composed = composePlaceOptions({
                  candidates: defaultPlaceCandidates(),
                  placeGapLabel: gapLbl,
                  whereKnown: Boolean(reality.where),
                });
                const top = composed.ranked[0];
                if (reality.when && top) {
                  return `${reality.what || "Dinner"} · ${reality.when} · ${top.name}`;
                }
                return activeChat.signalLabel || "Dinner · walk · dessert";
              })()}
            </p>
            <p className="curate-authorship">
              {curateAccepted
                ? "You accepted Opal's curation. They never saw the shortlist."
                : "You asked Opal to curate this."}
            </p>
            <div className="row-actions curate-actions">
              <button
                type="button"
                className="btn primary curate-looks-good"
                data-testid="curate-looks-good"
                onClick={() => {
                  // Private accept — does NOT auto-message. When place is the gap, draft place.
                  setCurateAccepted(true);
                  setCurateOpen(false);
                  if (reality.next_gap === "place") {
                    const cf = (
                      convSignal as {
                        collective_fit?: {
                          options?: Array<{ name?: string; area?: string }>;
                        };
                      } | null
                    )?.collective_fit;
                    const serverTop = cf?.options?.[0];
                    const top = serverTop
                      ? { name: serverTop.name || "Juniper & Ivy", area: serverTop.area || "" }
                      : composePlaceOptions({
                          candidates: defaultPlaceCandidates(),
                          placeGapLabel:
                            (convSignal?.shared_reality as { place_gap_label?: string })
                              ?.place_gap_label || "",
                        }).ranked[0] || {
                          name: "Juniper & Ivy",
                          area: "Little Italy",
                        };
                    const d = buildPlaceShareDraft({
                      name: top.name,
                      area: top.area,
                    });
                    setDraft(d.text);
                    document.getElementById("composer-input")?.focus();
                  } else if (activeChatId) {
                    const privateMoment: Message = {
                      id: `opal-filament-private-curate-${Date.now()}`,
                      from: "them",
                      body: "Evening composition is ready when you want to lead.",
                      time: new Date().toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      }),
                      opalFilament: true,
                      opalPrivate: true,
                      signal: {
                        kind: "plan_forming",
                        label: "Evening composition is ready when you want to lead.",
                      },
                    };
                    setThreads((prev) => ({
                      ...prev,
                      [activeChatId]: [...(prev[activeChatId] || []), privateMoment],
                    }));
                  }
                }}
              >
                {PRODUCT_COPY.looksGood}
              </button>
              <button
                type="button"
                className="btn ghost curate-change-vibe"
                data-testid="curate-change-vibe"
                onClick={() => {
                  // Stay private — recompose, no social message
                  setCurateAccepted(false);
                }}
              >
                {PRODUCT_COPY.changeVibe}
              </button>
            </div>
            <p className="curate-truth">
              Becomes the same Shared Reality object when you lead it socially.
            </p>
          </section>
        ) : null}

        {extendOpen ? (
          <section
            className="extend-panel private-opal-plate"
            data-testid="extend-panel"
            data-private="true"
            aria-label="Private extend possibilities"
          >
            <p className="private-opal-kicker">{PRODUCT_COPY.onlyYou}</p>
            <p className="curate-kicker">Keep the night going</p>
            <p className="curate-truth">{PRODUCT_COPY.extendPrivateLead}</p>
            {!extendSelected ? (
              <ul className="extend-options" data-testid="extend-options">
                {(
                  [
                    {
                      id: "jazz",
                      title: "Live jazz",
                      detail: "4 min away · starts in about 20 min",
                    },
                    {
                      id: "dessert",
                      title: "Dessert",
                      detail: "7 min walk · quiet · open late",
                    },
                    {
                      id: "rooftop",
                      title: "Rooftop",
                      detail: "6 min away · more lively",
                    },
                  ] as const
                ).map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className="extend-option"
                      data-testid={`extend-option-${opt.id}`}
                      onClick={() => {
                        // PRIVATE selection only — reversible, no peer message, no SR write.
                        setExtendSelected({
                          id: opt.id,
                          title: opt.title,
                          detail: opt.detail,
                        });
                      }}
                    >
                      <span className="presence-title">{opt.title}</span>
                      <span className="presence-detail">{opt.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="extend-selected" data-testid="extend-selected">
                <p className="presence-title">{extendSelected.title}</p>
                <p className="presence-detail">{extendSelected.detail}</p>
                <p className="curate-truth">
                  {activeChat.name} never sees this unless you share. You can just
                  lead in person.
                </p>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    data-testid="extend-back-options"
                    onClick={() => setExtendSelected(null)}
                  >
                    Back to options
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    data-testid="extend-go"
                    onClick={() => {
                      // Operational assist stays private — no social message.
                      setExtendOpen(false);
                      setExtendSelected(null);
                    }}
                  >
                    {PRODUCT_COPY.go}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    data-testid="extend-keep-private"
                    onClick={() => {
                      setExtendOpen(false);
                      setExtendSelected(null);
                    }}
                  >
                    {PRODUCT_COPY.keepPrivate}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    data-testid="extend-share"
                    onClick={() => {
                      // EXPLICIT share only — human chooses social message.
                      setDraft(
                        `${extendSelected.title} is around the corner if you want.`,
                      );
                      setExtendOpen(false);
                      setExtendSelected(null);
                      document.getElementById("composer-input")?.focus();
                    }}
                  >
                    Share
                  </button>
                </div>
              </div>
            )}
            <div className="row-actions">
              <button
                type="button"
                className="btn ghost"
                data-testid="extend-collapse"
                onClick={() => {
                  setExtendOpen(false);
                  setExtendSelected(null);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn ghost"
                data-testid="extend-not-tonight"
                onClick={() => {
                  setExtendOpen(false);
                  setExtendSelected(null);
                }}
              >
                {PRODUCT_COPY.notTonight}
              </button>
            </div>
          </section>
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

      {/*
        Brand chrome freeze: while 93:* pixels missing, do not stack two stale marks.
        Home (Figma 2:2) owns brand via V2BrandRow inside the living field.
        Other tabs keep a single topbar lockup.
      */}
      {tab !== "home" ? (
        <header className="topbar glass">
          <OpalLockup size="md" />
          {connectionState === "reconnecting" ||
          connectionState === "failed" ||
          connectionState === "session_expired" ? (
            <span className="session-pill session-pill-warn" role="status">
              {connectionState === "session_expired"
                ? "Sign in again"
                : "Trying to reconnect…"}
            </span>
          ) : null}
        </header>
      ) : connectionState === "reconnecting" ||
        connectionState === "failed" ||
        connectionState === "session_expired" ? (
        <header className="topbar glass topbar-status-only">
          <span className="session-pill session-pill-warn" role="status">
            {connectionState === "session_expired"
              ? "Sign in again"
              : "Trying to reconnect…"}
          </span>
        </header>
      ) : null}

      <main className="pane" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {loadError ? (
          <p className="activation-error" role="alert">
            {loadError}
          </p>
        ) : null}
        {tab === "home" ? (
          <HomePane
            needs={needs}
            chats={chats}
            onComplete={(id) => setNeeds((n) => n.filter((x) => x.id !== id))}
            onOpenChat={(id) => {
              if (id) void openChat(id);
              else setTab("chats");
            }}
            authenticated
            loading={loadingLive}
            signals={liveSignals}
            socialMoment={socialMoment}
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
  chats,
  onComplete,
  onOpenChat,
  authenticated,
  loading,
  signals,
  socialMoment,
}: {
  needs: NeedItem[];
  chats: ChatPreview[];
  onComplete: (id: string) => void;
  onOpenChat: (id?: string) => void;
  authenticated?: boolean;
  loading?: boolean;
  signals?: ProductSignal[];
  socialMoment?: string | null;
}) {
  const nameByConv = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of chats) m.set(c.id, c.name);
    return m;
  }, [chats]);

  const peerKeyByConv = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of chats) m.set(c.id, c.homePeerKey || c.id);
    return m;
  }, [chats]);

  // ONE strongest signal per peer/circle — not per seed conversation clone.
  const presence = authenticated
    ? strongestPerHomePresence(signals || [], peerKeyByConv).filter((s) => {
        // Show durable realities + consequential gaps (place open is allowed)
        if (s.kind === "proposal") return false;
        const stage = s.lifecycle_stage || "";
        if (stage === "canceled" || stage === "quiet") return false;
        return (
          isDurableForPlans(s) ||
          isConsequentialNeed(s) ||
          isUsableReality(s) ||
          stage === "still_open" ||
          stage === "plan_forming"
        );
      })
    : [];

  const awaken = needs[0];

  return (
    <div className="scroll home-living-field" data-testid="home-living-field" data-node-ref="2:2">
      {/* Figma 2:2 ambient Living Void field — calm energy only, not neon */}
      <V2AmbientField />
      <V2BrandRow />
      <h1 className="home-editorial">
        <span className="home-editorial-line">Tonight</span>
        <span className="home-editorial-line">is happening.</span>
      </h1>
      {loading ? <p className="empty">Loading…</p> : null}

      {/* Figma 2:7 — ONE awakening decision only (never stack five) */}
      {awaken ? (
        <AwakenSurface
          kicker={PRODUCT_COPY.chooseKicker}
          title={awaken.title}
          meta={[
            nameByConv.get(awaken.chatId || "") || "Someone",
            awaken.detail,
          ]
            .filter(Boolean)
            .join(" · ")}
          onClick={() => onOpenChat(awaken.chatId)}
        />
      ) : null}

      <section className="section presence-section" aria-label="With your people">
        {authenticated ? (
          presence.length === 0 && !awaken ? (
            <p className="empty">{PRODUCT_COPY.emptyNeedsYou}</p>
          ) : (
            presence.map((s, i) => {
              const who =
                nameByConv.get(s.conversation_id || "") ||
                s.shared_reality?.headline?.split(" ")[0] ||
                "Together";
              const lines = presenceLines(s);
              const isGroup = lines.composition === "group";
              const energy: PresenceEnergy = isUsableReality(s)
                ? "settled"
                : isGroup
                  ? "group"
                  : lines.gap
                    ? "possibility"
                    : s.lifecycle_stage === "handled" || energyRecall(s)
                      ? "recall"
                      : "calm";
              const whoLabel =
                isGroup && who.includes(",")
                  ? "Friends"
                  : who;
              return (
                <PresenceSurface
                  key={s.conversation_id || i}
                  who={whoLabel}
                  title={lines.title}
                  detail={
                    lines.gap
                      ? lines.gap
                      : lines.detail ||
                        (energy === "settled"
                          ? "settled"
                          : energy === "recall"
                            ? "Moment · recall"
                            : "Message · open")
                  }
                  energy={energy}
                  composition={lines.composition || s.composition || "dyad"}
                  memberCount={lines.memberCount}
                  conversationId={s.conversation_id}
                  onClick={() => onOpenChat(s.conversation_id)}
                />
              );
            })
          )
        ) : (
          PLANS.map((p) => (
            <PresenceSurface
              key={p.id}
              who={p.who}
              title={p.title}
              detail={[p.when, p.where].filter(Boolean).join(" · ")}
              energy="calm"
              onClick={() => onOpenChat(p.chatId)}
            />
          ))
        )}
      </section>
      {/* Social Moment — media primary, not feed (Figma 4:23). Only when real moment exists. */}
      {authenticated && socialMoment ? (
        <section className="section social-moment-section" aria-label="Social moment">
          <SocialMomentCard
            creator="A friend"
            caption={socialMoment}
            place={null}
            onDoWithPeople={() => {
              // Lineage → own Shared Reality possibility — open chats to start
              onOpenChat();
            }}
          />
        </section>
      ) : null}
    </div>
  );
}

function energyRecall(s: ProductSignal): boolean {
  return s.lifecycle_stage === "handled" || s.ui_job === "recall";
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
                data-conversation-id={c.id}
                data-testid="chat-row"
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

  // Same reality lineage as Home/Chat - not a parallel plan database.
  const durable = strongestPerConversation(signals || []).filter(isDurableForPlans);
  const usable = durable.filter((s) => {
    const reality = deriveSocialReality(s);
    // Fully settled: no meaningful next gap (or only extend)
    if (reality.next_gap === "none" && isUsableReality(s)) return true;
    const suf = s.shared_reality?.sufficiency;
    if (suf === "usable") return true;
    if (suf === "converging" || suf === "intention") return false;
    return (
      s.lifecycle_stage === "set" ||
      s.lifecycle_stage === "ready" ||
      s.lifecycle_stage === "handled"
    );
  });
  const converging = durable.filter((s) => !usable.includes(s));

  const planCardDetail = (s: ProductSignal) => {
    const reality = deriveSocialReality(s);
    const lines = presenceLines(s);
    if (reality.next_gap === "place") return PRODUCT_COPY.choosePlace;
    if (reality.next_gap === "time") return PRODUCT_COPY.findTime;
    return lines.detail || signalDetail(s) || s.evidence_preview || "From conversation";
  };

  return (
    <div className="scroll" data-testid="plans-field" data-node-ref="5:31">
      <h2 className="screen-title">Plans</h2>
      <p className="lede muted-lede">
        {authenticated
          ? "What you can actually count on  -  and what is almost there."
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
                data-next-gap={deriveSocialReality(s).next_gap}
                onClick={() => onOpenChat?.(s.conversation_id)}
              >
                <h4 className="plan-title">{surfaceLabel(s)}</h4>
                <p className="plan-detail">{planCardDetail(s)}</p>
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
                data-next-gap={deriveSocialReality(s).next_gap}
                onClick={() => onOpenChat?.(s.conversation_id)}
              >
                <h4 className="plan-title">{surfaceLabel(s)}</h4>
                <p className="plan-detail">{planCardDetail(s)}</p>
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
  onReplayIntro: _onReplayIntro,
  session,
  onSignOut,
  onFindPeople,
}: {
  onReplayIntro: () => void;
  session: ProductSession | null;
  onSignOut: () => void | Promise<void>;
  onFindPeople?: () => void;
}) {
  void _onReplayIntro;
  const name = session?.display_name?.trim() || null;
  const phone = (session as { phone?: string } | null)?.phone;
  const handle = (session as { handle?: string } | null)?.handle;
  let tz = "local";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  } catch {
    tz = "local";
  }

  return (
    <div className="scroll profile-pane" data-testid="profile-pane">
      <h2 className="screen-title">{name || "Profile"}</h2>
      <article className="card profile-card lumen-card" data-testid="profile-identity">
        <div className="avatar lg avatar-lumen" aria-hidden>
          {name
            ? name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("")
            : "?"}
        </div>
        <div>
          <h4>{name || "Not signed in"}</h4>
          {phone ? <p className="profile-meta">{phone}</p> : null}
          {handle ? <p className="profile-meta">@{handle}</p> : null}
          {!session ? <p className="profile-meta">Sign in to see your identity</p> : null}
        </div>
      </article>

      <section className="section" aria-label="Location and time">
        <h3 className="section-label">Location & time</h3>
        <div className="settings-row static" data-testid="profile-timezone">
          <span>Timezone</span>
          <span className="muted">{tz}</span>
        </div>
        <p className="profile-hint">
          Opal keeps event times human and local. Timezone stays ambient unless
          people are coordinating across places.
        </p>
      </section>

      <section className="section" aria-label="Social">
        <h3 className="section-label">Social</h3>
        {session ? (
          <button
            type="button"
            className="settings-row"
            data-testid="profile-people"
            onClick={onFindPeople}
          >
            <span>People</span>
            <span className="muted">Invite</span>
          </button>
        ) : null}
      </section>

      <section className="section" aria-label="Account">
        <h3 className="section-label">Account</h3>
        {session ? (
          <button
            type="button"
            className="settings-row"
            data-testid="sign-out"
            onClick={() => void onSignOut()}
          >
            <span>Sign out</span>
            <span className="muted">This browser</span>
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
