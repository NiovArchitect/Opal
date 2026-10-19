/**
 * Phase OC-1 / OC-6 — Opal Center conversational shell.
 * OC-6 adds native STT/TTS (mic + speak-back). Text pipeline unchanged.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  clearOpalChatSession,
  clearOpalConversation,
  createOpalChatSession,
  getOpalChatSession,
  getOpalConversation,
  isRateLimitedSendError,
  listOpalChatSessions,
  listRelationships,
  opalConversationTitleError,
  patchOpalConversationTitle,
  postOpalLocation,
  postOpalMessage,
  postOpalSessionMessage,
  startOpalNewChat,
  type OpalChatMessage,
  type OpalChatSessionSummary,
} from "../api/productClient";
import { readCachedDeviceCoords } from "../device/deviceLocation";
import {
  OpalChatSessionsDrawer,
  distinctSessionLabels,
  sessionRowLabel,
} from "./OpalChatSessionsDrawer";
import { ProfileGapAsk } from "./ProfileGapAsk";
import { CheckinAskCard } from "./CheckinAskCard";
import { CheckinSummaryCard } from "./CheckinSummary";
import {
  LISTENING_COPY,
  MIC_BLOCKED_COPY,
  STT_FAIL_COPY,
  VOICE_OFFLINE_COPY,
  VOICE_UNAVAILABLE_COPY,
  getVoiceMode,
  isOnline,
  isSttAvailable,
  listenOnce,
  probeMicPermission,
  setVoiceMode,
  speakText,
  stopListening,
  stopSpeaking,
  type MicPermission,
} from "./opalCenterVoice";
import {
  planFromOpalMetadata,
  type CreatedPlanSurface,
} from "./graphSurfaceInterop";
import { OpalLivingCharacter } from "./OpalLivingCharacter";
import { readFitSliceForOpal } from "./fitPreferences";

const PLACEHOLDER = "Talk to Opal…";
const EMPTY_COPY = "Say hello to Opal";
/** Pass 2 memory intelligence LOCKED — no "Remember something" consumer chip. */
const CHIPS = ["Plan something", "What's coming up?"] as const;
const SEND_FAIL = "Couldn't send. Tap to retry";
/** Repair #18 - the backend throttle shape (429, sent:false) rendered honestly. */
const SEND_THROTTLED = "Not sent - tap to retry";
const LOAD_FAIL = "Couldn't load conversation";
const MAX_BODY = 2000;
const MAX_LINES = 5;
/**
 * Repair #18 - provider poll bounds. The poll exists only while the
 * LATEST Opal message is queued/running; it backs off, caps out, and
 * dies with the view. Before this it ticked every 1.8s forever, armed
 * by any stale queued message in history, and each tick was a switch
 * POST (the 47x storm).
 */
export const POLL_FIRST_DELAY_MS = 1800;
export const POLL_MAX_DELAY_MS = 15_000;
export const POLL_MAX_ATTEMPTS = 20;
export const POLL_MAX_DURATION_MS = 90_000;

export function pollDelayMs(attempt: number): number {
  return Math.min(POLL_FIRST_DELAY_MS * 2 ** Math.max(0, attempt), POLL_MAX_DELAY_MS);
}

type PlaceOption = {
  id?: string;
  name?: string;
  address?: string;
  search_geography?: string;
  cuisine?: string | null;
  provider?: string;
};

type LocalMsg = {
  key: string;
  id?: string;
  role: "user" | "opal";
  body: string;
  inserted_at?: string | null;
  status?: "pending" | "sent" | "failed";
  /** Repair #18 - why a send failed: "throttled" is the backend's
   * explicit not-sent shape; anything else is a generic failure. */
  failure?: "throttled" | "generic";
  metadata?: Record<string, unknown> | null;
};

/** Per-chat working state (Repair #18, G-IA4): draft + scroll, keyed by chat id. */
type PerChatState = {
  draft: string;
  scrollTop: number | null;
  stick: boolean;
};

type Props = {
  onBack: () => void;
  bearer?: string;
  /** Optional user id for per-user voice-mode persistence. */
  userId?: string | null;
  /** Fired when a plan is confirmed (backend plan metadata only). */
  onPlanCreated?: (plan: CreatedPlanSurface) => void;
  /**
   * Repair #4 — rest composer / chips converge here.
   * When set, auto-send once after conversation hydrate (one intelligence path).
   */
  initialMessage?: string | null;
  /**
   * Repair #18 — when true, `initialMessage` is a SEED, not a send: it
   * lands as a composer draft and nothing is posted. With
   * `initialChatIntent="new"` the draft lands in a NEW chat (the rest
   * composer's chips path); the previous chat is untouched.
   */
  seedAsDraft?: boolean;
  initialChatIntent?: "new" | "current";
};

function MeridianGlobeMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="opal-center-chat-mark">
      <g className="globe-grid" fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="24" cy="24" r="14.5" strokeWidth="2" />
        <ellipse className="globe-meridian" cx="24" cy="24" rx="9.5" ry="14.5" strokeWidth="1.5" />
        <ellipse className="globe-meridian" cx="24" cy="24" rx="4.75" ry="14.5" strokeWidth="1.5" />
        <ellipse className="globe-parallel" cx="24" cy="17" rx="12.5" ry="2.8" strokeWidth="1.5" />
        <ellipse className="globe-parallel" cx="24" cy="31" rx="12.5" ry="2.8" strokeWidth="1.5" />
        <ellipse className="globe-equator" cx="24" cy="24" rx="14.5" ry="3" strokeWidth="1.5" />
      </g>
      <path
        className="globe-pick"
        d="M 24 18.5 C 27 18.5 29 20.5 29 23 C 29 26 26.5 28.5 24 30 C 21.5 28.5 19 26 19 23 C 19 20.5 21 18.5 24 18.5 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function SendArrow() {
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

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 11a6 6 0 0 0 12 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9v6h3.5L12 19V5L7.5 9H4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill={on ? "currentColor" : "none"}
      />
      {on ? (
        <>
          <path
            d="M15.5 8.5a4.5 4.5 0 0 1 0 7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M17.8 6a7.5 7.5 0 0 1 0 12"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d="M16 9l5 5M21 9l-5 5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function fromServer(m: OpalChatMessage): LocalMsg {
  return {
    key: m.id,
    id: m.id,
    role: m.role === "opal" ? "opal" : "user",
    body: m.body,
    inserted_at: m.inserted_at,
    status: "sent",
    metadata: (m.metadata || null) as Record<string, unknown> | null,
  };
}

/**
 * Repair #16 W3 — birthday-plan detection for the progressive ask.
 * The Center pipeline marks birthday turns in the message metadata's
 * context_snapshot (`intent_scope: "birthday"`, `who`/`primary_person`
 * set from the utterance — see PlanContextPatch). Returns the honoree's
 * name from the LATEST such turn, or null. Name only: identity
 * resolution happens against the owner's relationship contacts, and
 * fails closed (no assess) when the name doesn't resolve uniquely.
 */
function birthdayPersonNameFromMessages(messages: LocalMsg[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== "opal") continue;
    const snap = m.metadata?.context_snapshot as Record<string, unknown> | undefined;
    if (!snap || snap.intent_scope !== "birthday") continue;
    const who = [snap.who, snap.primary_person].find(
      (v): v is string => typeof v === "string" && v.trim() !== "" && v !== "__clear__",
    );
    if (who) return who.trim();
  }
  return null;
}

function optionsFromMeta(meta?: Record<string, unknown> | null): PlaceOption[] {
  const raw = meta?.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is Record<string, unknown> => !!o && typeof o === "object")
    .map((o) => ({
      id: typeof o.id === "string" ? o.id : undefined,
      name: typeof o.name === "string" ? o.name : undefined,
      address: typeof o.address === "string" ? o.address : undefined,
      search_geography: typeof o.search_geography === "string" ? o.search_geography : undefined,
      cuisine: typeof o.cuisine === "string" ? o.cuisine : null,
      provider: typeof o.provider === "string" ? o.provider : undefined,
    }))
    .filter((o) => !!o.name);
}

/** Prefer prop; else product profile in localStorage (per-device voice preference). */
function resolveVoiceUserId(explicit?: string | null): string | null {
  if (explicit) return explicit;
  try {
    const raw = localStorage.getItem("opal.product.profile.v17");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user_id?: string };
    return parsed?.user_id ? String(parsed.user_id) : null;
  } catch {
    return null;
  }
}

export function OpalCenterChat({
  onBack,
  bearer,
  userId,
  onPlanCreated,
  initialMessage = null,
  seedAsDraft = false,
  initialChatIntent = "current",
}: Props) {
  const voiceUserId = resolveVoiceUserId(userId);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showTimeKey, setShowTimeKey] = useState<string | null>(null);
  const [voiceMode, setVoiceModeState] = useState(() => getVoiceMode(voiceUserId));
  const [listening, setListening] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("prompt");
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [online, setOnline] = useState(() => isOnline());
  const [audioPlaying, setAudioPlaying] = useState(false);
  // Repair #16 W3 — progressive profile ask (birthday): the honoree of
  // the latest birthday-plan turn, resolved to a relationship contact.
  const [gapPerson, setGapPerson] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const loadGen = useRef(0);
  const hydrated = useRef(false);
  const spokenIds = useRef<Set<string>>(new Set());
  const voiceModeRef = useRef(voiceMode);
  voiceModeRef.current = voiceMode;
  const onPlanCreatedRef = useRef(onPlanCreated);
  onPlanCreatedRef.current = onPlanCreated;
  const initialSentRef = useRef(false);
  const initialMessageRef = useRef(initialMessage);
  initialMessageRef.current = initialMessage;
  // Per-conversation ordered send queue — composer stays responsive while prior POSTs flush.
  const sendQueueRef = useRef<Array<{ body: string; optimisticKey: string }>>([]);
  const flushingRef = useRef(false);
  const lastEnqueuedBodyRef = useRef<string | null>(null);
  const lastEnqueueAtRef = useRef(0);
  // Scroll ownership: auto-follow only while the user is near the bottom.
  const stickToBottomRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const jumpLockUntilRef = useRef(0);
  const scrollPinTimersRef = useRef<number[]>([]);
  const scrollPinGenRef = useRef(0);
  const [showJump, setShowJump] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearError, setClearError] = useState(false);
  // Repair #17 W5 — real backend chat sessions. sessionsMode turns on only
  // when the sessions list route actually answers; until then every call
  // below stays on the legacy single-conversation endpoints.
  const [sessions, setSessions] = useState<OpalChatSessionSummary[] | null>(null);
  const [sessionsFailed, setSessionsFailed] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);
  const sessionsModeRef = useRef(false);
  const sessionsRef = useRef<OpalChatSessionSummary[] | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  const setActiveSession = useCallback((id: string | null) => {
    activeSessionIdRef.current = id;
    setActiveSessionIdState(id);
  }, []);
  const NEAR_BOTTOM_PX = 96;
  // Repair #18 (G-IA2) - the open chat's own title, from the backend
  // conversation contract (auto-title from the first user message).
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  // Repair #18 (G-IA3) - inline rename of the open chat. The draft is
  // local ONLY while editing; the displayed title changes solely from
  // the summary the rename endpoint returns, never from the draft.
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  // Repair #18 (G-IA4) - per-chat draft + scroll, keyed by conversation id.
  const perChatRef = useRef<Map<string, PerChatState>>(new Map());
  const draftRef = useRef("");
  // Repair #18 - provider poll bookkeeping: one bounded session per
  // latest-queued message, never re-armed by stale history.
  const pollRef = useRef<{ key: string; attempts: number; startedAt: number } | null>(null);
  const [viewVisible, setViewVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  // Repair #18 - location ingest is best-effort and throttled per mount.
  const lastLocationPostRef = useRef(0);

  const chatStateKey = useCallback(
    () =>
      activeSessionIdRef.current || currentConversationIdRef.current || "legacy",
    [],
  );

  /** Snapshot the viewed chat's draft + scroll under its own key. */
  const saveChatState = useCallback(() => {
    const key = chatStateKey();
    const el = threadRef.current;
    perChatRef.current.set(key, {
      draft: draftRef.current,
      scrollTop: el ? el.scrollTop : null,
      stick: stickToBottomRef.current,
    });
  }, [chatStateKey]);

  /** Restore a chat's own draft (scroll is restored after paint). */
  const restoreChatDraft = useCallback((key: string) => {
    const saved = perChatRef.current.get(key);
    const next = saved?.draft ?? "";
    draftRef.current = next;
    setDraft(next);
    return saved ?? null;
  }, []);

  /** Restore a chat's scroll position once its messages have painted. */
  const restoreChatScroll = useCallback(
    (saved: PerChatState | null) => {
      const apply = () => {
        const el = threadRef.current;
        if (!el) return;
        if (saved && saved.stick === false && typeof saved.scrollTop === "number") {
          stickToBottomRef.current = false;
          el.scrollTop = saved.scrollTop;
          setShowJump(distanceFromBottom(el) > NEAR_BOTTOM_PX);
        } else {
          stickToBottomRef.current = true;
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(apply));
      window.setTimeout(apply, 90);
    },
    [],
  );

  // Keep the draft mirror + the viewed chat's saved draft in sync with
  // every composer change, whichever path set it (typing, mic, retry).
  useEffect(() => {
    draftRef.current = draft;
    const key = chatStateKey();
    const prev = perChatRef.current.get(key);
    perChatRef.current.set(key, {
      draft,
      scrollTop: prev?.scrollTop ?? null,
      stick: prev?.stick ?? true,
    });
  }, [draft, chatStateKey]);

  // Polling stops when the view is hidden; it resumes only if the
  // latest turn is still genuinely waiting when the view returns.
  useEffect(() => {
    const onVis = () => setViewVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Repair #17: plans surface ONLY from backend plan metadata
  // (planFromOpalMetadata in the send path). The former founder-seed local
  // confirm — synthesizing a plan plus a fabricated Opal confirmation
  // reply when the user said "yes" — was scripted and is deleted.

  const distanceFromBottom = (el: HTMLElement) =>
    el.scrollHeight - el.scrollTop - el.clientHeight;

  const isNearBottom = (el: HTMLElement) => distanceFromBottom(el) <= NEAR_BOTTOM_PX;

  const clearScrollPinTimers = useCallback(() => {
    for (const id of scrollPinTimersRef.current) window.clearTimeout(id);
    scrollPinTimersRef.current = [];
  }, []);

  const scrollToEnd = useCallback((force = false) => {
    const el = threadRef.current;
    if (!el) return;
    if (!force && !stickToBottomRef.current) return;
    clearScrollPinTimers();
    const gen = ++scrollPinGenRef.current;
    programmaticScrollRef.current = true;
    stickToBottomRef.current = true;
    // Hold stick through layout settle + provider paint. Hide Jump only after
    // the pin measures near-bottom — unmounting Jump mid-click can restore
    // focus and snap the thread back to scrollTop 0 in headless WebKit.
    if (force) jumpLockUntilRef.current = Date.now() + 1600;
    const pin = () => {
      if (gen !== scrollPinGenRef.current) return;
      // Repair #18 - a scheduled pin must not fight a later user scroll
      // or a restored per-chat scroll position: stick is re-checked at
      // pin time, not only when the pin was scheduled.
      if (!force && !stickToBottomRef.current) return;
      const node = threadRef.current;
      if (!node) return;
      // Only scroll the thread itself — scrollIntoView can move a parent and leave
      // thread.scrollTop unchanged (breaks Jump-to-latest).
      const max = Math.max(0, node.scrollHeight - node.clientHeight);
      node.scrollTop = max;
      if (node.scrollTop < max - 2 && typeof node.scrollBy === "function") {
        node.scrollBy(0, max - node.scrollTop);
      }
    };
    pin();
    const delays = force ? [0, 16, 50, 120, 250, 500, 900, 1300] : [0, 50, 280];
    for (const ms of delays) {
      const id = window.setTimeout(() => {
        if (gen !== scrollPinGenRef.current) return;
        pin();
        if (ms !== delays[delays.length - 1]) return;
        stickToBottomRef.current = true;
        programmaticScrollRef.current = false;
        const node = threadRef.current;
        if (!node) return;
        const near = distanceFromBottom(node) <= NEAR_BOTTOM_PX;
        stickToBottomRef.current = near || force;
        setShowJump(!(near || (force && distanceFromBottom(node) < 160)));
      }, ms);
      scrollPinTimersRef.current.push(id);
    }
  }, [clearScrollPinTimers]);

  const onThreadScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;
    if (Date.now() < jumpLockUntilRef.current) return;
    const el = threadRef.current;
    if (!el) return;
    const near = isNearBottom(el);
    stickToBottomRef.current = near;
    setShowJump(!near);
    // Repair #18 (G-IA4) - remember where this chat was left.
    saveChatState();
  }, [saveChatState]);

  // Test / harness hook: force history-read position without fighting stick lock.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const api = {
      scrollToTop: () => {
        clearScrollPinTimers();
        scrollPinGenRef.current += 1;
        programmaticScrollRef.current = false;
        jumpLockUntilRef.current = 0;
        stickToBottomRef.current = false;
        el.scrollTop = 0;
        if (typeof el.scrollTo === "function") el.scrollTo({ top: 0, behavior: "auto" });
        setShowJump(distanceFromBottom(el) > NEAR_BOTTOM_PX);
      },
      metrics: () => ({
        top: el.scrollTop,
        max: Math.max(0, el.scrollHeight - el.clientHeight),
        dist: distanceFromBottom(el),
        stick: stickToBottomRef.current,
      }),
    };
    (el as HTMLElement & { __opalCenterScroll?: typeof api }).__opalCenterScroll = api;
    return () => {
      delete (el as HTMLElement & { __opalCenterScroll?: typeof api }).__opalCenterScroll;
    };
  }, [clearScrollPinTimers]);

  const load = useCallback(async () => {
    const gen = ++loadGen.current;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getOpalConversation(bearer);
      if (gen !== loadGen.current) return;
      const convId = res.conversation?.id ? String(res.conversation.id) : null;
      currentConversationIdRef.current = convId;
      setConversationTitle(
        typeof res.conversation?.title === "string" ? res.conversation.title : null,
      );
      // If the sessions list already arrived and knows this conversation,
      // it is the active session — sends then route to its session path.
      if (
        convId &&
        !activeSessionIdRef.current &&
        sessionsRef.current?.some((s) => s.id === convId)
      ) {
        setActiveSession(convId);
      }
      const list = Array.isArray(res.conversation?.messages)
        ? res.conversation.messages.map(fromServer)
        : [];
      // Mark existing history as already "heard" so reload doesn't re-speak.
      for (const m of list) {
        if (m.role === "opal" && m.id) spokenIds.current.add(m.id);
      }
      setMessages(list);
      hydrated.current = true;
    } catch {
      if (gen !== loadGen.current) return;
      setLoadError(true);
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }, [bearer]);

  useEffect(() => {
    void load();
    return () => {
      loadGen.current += 1;
      stopListening();
      stopSpeaking();
    };
  }, [load]);

  // Repair #18 - bounded provider poll so RESULTS_READY options appear.
  //
  // Rules (the storm fix):
  // - Arms ONLY when the LATEST Opal message is queued/running. A stale
  //   queued/running entry buried in history never arms it.
  // - Reads go through the read-only GET conversation endpoint, NEVER
  //   the switch POST. A switch is a deliberate user action only.
  // - Backoff (1.8s doubling to a 15s ceiling), a hard attempt cap, and
  //   a hard duration cap - after which the working indicator stays
  //   honest but the network goes quiet.
  // - Load-generation + chat-key guard: a fetch that resolves after a
  //   chat switch is dropped, never painted over the viewed chat.
  // - Stops when the view is hidden or the component unmounts (the
  //   effect cleanup clears the pending timer).
  useEffect(() => {
    const latestOpal = [...messages].reverse().find((m) => m.role === "opal");
    const waiting =
      latestOpal?.metadata?.action_state === "queued" ||
      latestOpal?.metadata?.action_state === "running";
    if (!waiting || !latestOpal) {
      pollRef.current = null;
      return;
    }
    if (!viewVisible) return;
    const key = latestOpal.id || latestOpal.key;
    if (!pollRef.current || pollRef.current.key !== key) {
      pollRef.current = { key, attempts: 0, startedAt: Date.now() };
    }
    const session = pollRef.current;
    if (
      session.attempts >= POLL_MAX_ATTEMPTS ||
      Date.now() - session.startedAt >= POLL_MAX_DURATION_MS
    ) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        session.attempts += 1;
        const gen = loadGen.current;
        const chatKey = chatStateKey();
        try {
          const res = await getOpalConversation(bearer);
          if (cancelled) return;
          // A stale fetch must NEVER paint a previous chat over this one.
          if (gen !== loadGen.current || chatKey !== chatStateKey()) return;
          const convId = res.conversation?.id ? String(res.conversation.id) : null;
          if (
            convId &&
            currentConversationIdRef.current &&
            convId !== currentConversationIdRef.current
          ) {
            return;
          }
          const list = Array.isArray(res.conversation?.messages)
            ? res.conversation.messages.map(fromServer)
            : [];
          setMessages(list);
        } catch {
          /* keep prior messages */
        }
      })();
    }, pollDelayMs(session.attempts));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [messages, bearer, viewVisible, chatStateKey]);

  useEffect(() => {
    setVoiceModeState(getVoiceMode(resolveVoiceUserId(userId)));
  }, [userId]);

  useEffect(() => {
    void probeMicPermission().then(setMicPermission);
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollToEnd(false);
  }, [messages, sending, scrollToEnd]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    // Grow with content up to MAX_LINES, then scroll internally (P0-C).
    ta.style.height = "0px";
    const line = 20;
    const pad = 16;
    const max = line * MAX_LINES + pad;
    const next = Math.min(Math.max(ta.scrollHeight, 36), max);
    ta.style.height = `${next}px`;
  }, [draft]);

  // Speak new Opal replies when voice mode is on. speaking state only while audio plays.
  useEffect(() => {
    if (!voiceMode) return;
    const newest = [...messages].reverse().find((m) => m.role === "opal" && m.status !== "failed");
    if (!newest) return;
    const id = newest.id || newest.key;
    if (spokenIds.current.has(id)) return;
    if (newest.status === "pending") return;
    spokenIds.current.add(id);
    let cancelled = false;
    setAudioPlaying(true);
    void speakText(newest.body).finally(() => {
      if (!cancelled) setAudioPlaying(false);
    });
    return () => {
      cancelled = true;
      setAudioPlaying(false);
    };
  }, [messages, voiceMode]);

  const emitPlanIfAny = useCallback((plan: CreatedPlanSurface | null) => {
    if (!plan) return;
    onPlanCreatedRef.current?.(plan);
  }, []);

  const flushSendQueue = useCallback(async () => {
    if (flushingRef.current) return;
    const next = sendQueueRef.current[0];
    if (!next) {
      setSending(false);
      setQueuedCount(0);
      return;
    }
    flushingRef.current = true;
    setSending(true);
    setQueuedCount(Math.max(0, sendQueueRef.current.length - 1));

    const { body, optimisticKey } = next;
    stopSpeaking();
    stopListening();
    setListening(false);
    // Invalidate in-flight history fetches so a late GET cannot wipe local rows.
    loadGen.current += 1;
    setLoading(false);
    setLoadError(false);

    try {
      // Repair #18 (location) - when the user has granted location, the
      // cached device fix exists (deviceLocation only caches after a
      // real granted fix). Post it through the EXISTING Center location
      // ingest the backend reads (POST /opal/location -> DeviceLocation
      // -> OpalContext location slice) before the send, throttled, so
      // the grounded answer has its raw material. Not granted: no cache,
      // nothing is sent, and the backend's honest answer stands. The
      // message payload itself never carries coordinates.
      const cachedCoords = readCachedDeviceCoords();
      if (cachedCoords && Date.now() - lastLocationPostRef.current > 60_000) {
        lastLocationPostRef.current = Date.now();
        void postOpalLocation(
          {
            lat: cachedCoords.lat,
            lon: cachedCoords.lng,
            accuracy_m: cachedCoords.accuracy,
          },
          bearer,
        ).catch(() => {
          /* Best-effort: the Center works without coords. */
        });
      }
      const fit = readFitSliceForOpal(userId);
      const activeId = activeSessionIdRef.current;
      const res = activeId
        ? await postOpalSessionMessage(
            activeId,
            body,
            bearer,
            fit ? { clientContext: { fit } } : undefined,
          )
        : fit
          ? await postOpalMessage(body, bearer, { clientContext: { fit } })
          : await postOpalMessage(body, bearer);
      // A retry that finally lands clears the restored composer copy of
      // the same words (failure restoration put them back there).
      if (draftRef.current.trim() === body) {
        draftRef.current = "";
        setDraft("");
      }
      const rawMsgs = Array.isArray(res.messages) ? res.messages : [];
      const serverMsgs = rawMsgs.map(fromServer);
      setMessages((prev) => {
        const without = prev.filter((m) => m.key !== optimisticKey);
        return [...without, ...serverMsgs];
      });
      for (const m of rawMsgs) {
        if (m.role !== "opal") continue;
        const fromMeta = planFromOpalMetadata(
          (m.metadata || null) as Record<string, unknown> | null,
        );
        if (fromMeta) {
          emitPlanIfAny(fromMeta);
          break;
        }
      }
    } catch (err) {
      // Repair #17: a failed Center send is an honest failure state — never
      // a locally fabricated Opal reply or plan (former seed-mode fallback).
      // Repair #18: the backend throttle rejection is explicit and
      // distinguishable (429, sent:false, retryable:true). It renders as
      // "Not sent - tap to retry" and the user's words go back into the
      // composer (when it is empty) - never silently eaten.
      const throttled = isRateLimitedSendError(err);
      if (!draftRef.current.trim()) {
        draftRef.current = body;
        setDraft(body);
      }
      setMessages((prev) => {
        const exists = prev.some((m) => m.key === optimisticKey);
        if (!exists) {
          return [
            ...prev,
            {
              key: optimisticKey,
              role: "user",
              body,
              status: "failed",
              failure: throttled ? "throttled" : "generic",
            },
          ];
        }
        return prev.map((m) =>
          m.key === optimisticKey
            ? { ...m, status: "failed", failure: throttled ? "throttled" : "generic" }
            : m,
        );
      });
    }

    sendQueueRef.current.shift();
    flushingRef.current = false;
    requestAnimationFrame(() => inputRef.current?.focus());
    if (sendQueueRef.current.length === 0) {
      setSending(false);
      setQueuedCount(0);
    } else {
      setQueuedCount(sendQueueRef.current.length);
      void flushSendQueue();
    }
  }, [bearer, userId, emitPlanIfAny]);

  const sendBody = useCallback(
    async (raw: string, retryKey?: string) => {
      const body = raw.trim().slice(0, MAX_BODY);
      if (!body) return;

      // Soft-debounce identical rapid doubles — never silently drop a new turn.
      const now = Date.now();
      if (
        !retryKey &&
        lastEnqueuedBodyRef.current === body &&
        now - lastEnqueueAtRef.current < 400
      ) {
        return;
      }

      const optimisticKey = retryKey || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (!retryKey) {
        // User-initiated send re-pins bottom-follow.
        stickToBottomRef.current = true;
        setShowJump(false);
        setDraft("");
        setMessages((prev) => [
          ...prev,
          { key: optimisticKey, role: "user", body, status: "pending" },
        ]);
        requestAnimationFrame(() => scrollToEnd(true));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.key === retryKey ? { ...m, status: "pending" } : m)),
        );
        // Retry: re-queue only this key if not already queued.
        if (!sendQueueRef.current.some((q) => q.optimisticKey === optimisticKey)) {
          sendQueueRef.current.push({ body, optimisticKey });
        }
        lastEnqueuedBodyRef.current = body;
        lastEnqueueAtRef.current = now;
        setQueuedCount(Math.max(0, sendQueueRef.current.length - (flushingRef.current ? 1 : 0)));
        void flushSendQueue();
        return;
      }

      sendQueueRef.current.push({ body, optimisticKey });
      lastEnqueuedBodyRef.current = body;
      lastEnqueueAtRef.current = now;
      setQueuedCount(Math.max(0, sendQueueRef.current.length - (flushingRef.current ? 1 : 0)));
      void flushSendQueue();
    },
    [flushSendQueue, scrollToEnd],
  );

  const resetLocalChatState = useCallback(() => {
    sendQueueRef.current = [];
    flushingRef.current = false;
    setQueuedCount(0);
    setSending(false);
    setMessages([]);
    draftRef.current = "";
    setDraft("");
    stickToBottomRef.current = true;
    setShowJump(false);
    setMenuOpen(false);
    setClearConfirm(false);
    setClearError(false);
    setRenaming(false);
    setRenameDraft("");
    setRenameError(null);
    setRenameSaving(false);
    spokenIds.current = new Set();
    pollRef.current = null;
  }, []);

  /**
   * Repair #17 W5 — sessions discovery. Success (even an empty list) turns
   * sessions mode on; failure leaves the legacy single-conversation path
   * fully in charge and the drawer reports the failure honestly.
   */
  const refreshSessions = useCallback(async () => {
    try {
      const res = await listOpalChatSessions(bearer);
      const list = Array.isArray(res.conversations) ? res.conversations : [];
      sessionsModeRef.current = true;
      sessionsRef.current = list;
      setSessions(list);
      setSessionsFailed(false);
      const currentId = currentConversationIdRef.current;
      if (currentId && !activeSessionIdRef.current && list.some((s) => s.id === currentId)) {
        setActiveSession(currentId);
      }
      return list;
    } catch {
      setSessionsFailed(true);
      return null;
    }
  }, [bearer, setActiveSession]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const selectSession = useCallback(
    async (id: string) => {
      setSessionsOpen(false);
      // Repair #18 - re-opening the ACTIVE chat is zero calls: it is
      // already on screen, with its draft and scroll untouched.
      if (id === activeSessionIdRef.current) return;
      // A pending rest-composer seed belongs to the chat it was typed in.
      initialSentRef.current = true;
      // Repair #18 (G-IA4) - park the viewed chat's draft + scroll first.
      saveChatState();
      const gen = ++loadGen.current;
      setLoading(true);
      setLoadError(false);
      try {
        // Exactly ONE switch call per deliberate user action.
        const res = await getOpalChatSession(id, bearer);
        if (gen !== loadGen.current) return;
        const list = Array.isArray(res.conversation?.messages)
          ? res.conversation.messages.map(fromServer)
          : [];
        resetLocalChatState();
        for (const m of list) {
          if (m.role === "opal" && m.id) spokenIds.current.add(m.id);
        }
        setMessages(list);
        setActiveSession(id);
        currentConversationIdRef.current = id;
        setConversationTitle(
          typeof res.conversation?.title === "string" ? res.conversation.title : null,
        );
        hydrated.current = true;
        // Restore THIS chat's own draft + scroll position.
        const saved = restoreChatDraft(id);
        restoreChatScroll(saved);
      } catch {
        if (gen === loadGen.current) setLoadError(true);
      } finally {
        if (gen === loadGen.current) setLoading(false);
      }
    },
    [bearer, resetLocalChatState, setActiveSession, saveChatState, restoreChatDraft, restoreChatScroll],
  );

  const onNewChat = useCallback(async () => {
    setMenuOpen(false);
    setSessionsOpen(false);
    // Repair #18 (G-IA4/G-IA7) - the current chat is kept, with its
    // draft and scroll parked under its own key before we leave it.
    saveChatState();
    if (sessionsModeRef.current) {
      try {
        const res = await createOpalChatSession(bearer);
        const conv = res.conversation;
        resetLocalChatState();
        if (conv?.id) {
          setActiveSession(conv.id);
          currentConversationIdRef.current = conv.id;
          setConversationTitle(
            typeof conv.title === "string" ? conv.title : null,
          );
          const summary: OpalChatSessionSummary = {
            id: conv.id,
            title: conv.title ?? null,
            message_count: 0,
            last_message_preview: null,
            inserted_at: conv.inserted_at ?? null,
            updated_at: conv.updated_at ?? null,
          };
          sessionsRef.current = [
            summary,
            ...(sessionsRef.current ?? []).filter((s) => s.id !== conv.id),
          ];
          setSessions(sessionsRef.current);
          const list = Array.isArray(conv.messages) ? conv.messages.map(fromServer) : [];
          setMessages(list);
          hydrated.current = true;
          restoreChatDraft(conv.id);
        }
      } catch {
        /* keep the current chat on failure — never fake a new one */
      }
      return;
    }
    try {
      await startOpalNewChat(bearer);
      resetLocalChatState();
      setConversationTitle(null);
    } catch {
      /* keep prior messages on failure */
    }
  }, [bearer, resetLocalChatState, setActiveSession, saveChatState, restoreChatDraft]);

  /** Clear step 1 — arm the plain-language confirm bar (no delete yet). */
  const onClearConversation = useCallback(() => {
    setMenuOpen(false);
    setClearError(false);
    setClearConfirm(true);
  }, []);

  /** Clear step 2 — the delete actually happens server-side, then local reset. */
  const confirmClearConversation = useCallback(async () => {
    const activeId = activeSessionIdRef.current;
    try {
      if (activeId) {
        await clearOpalChatSession(activeId, bearer);
        if (sessionsRef.current) {
          sessionsRef.current = sessionsRef.current.map((s) =>
            s.id === activeId
              ? { ...s, message_count: 0, last_message_preview: null }
              : s,
          );
          setSessions(sessionsRef.current);
        }
      } else {
        await clearOpalConversation(bearer);
      }
      // The cleared chat's parked draft/scroll go with its messages.
      perChatRef.current.delete(chatStateKey());
      resetLocalChatState();
      setConversationTitle(null);
    } catch {
      // Honest failure: the chat is NOT cleared and the confirm stays up.
      setClearError(true);
    }
  }, [bearer, resetLocalChatState, chatStateKey]);

  // Repair #18 (G-IA3) - rename the open chat, inline in the header.
  useEffect(() => {
    if (!renaming) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renaming]);

  const startRename = useCallback(() => {
    const id = activeSessionIdRef.current || currentConversationIdRef.current;
    if (!id) return;
    const summaryTitle = sessionsRef.current?.find((s) => s.id === id)?.title;
    const current =
      typeof summaryTitle === "string" && summaryTitle.trim()
        ? summaryTitle
        : conversationTitle || "";
    setRenameDraft(current);
    setRenameError(null);
    setRenaming(true);
  }, [conversationTitle]);

  const cancelRename = useCallback(() => {
    // Nothing was written: the header and the list keep the title the
    // server already holds, and the draft is discarded.
    setRenaming(false);
    setRenameDraft("");
    setRenameError(null);
  }, []);

  const saveRename = useCallback(async () => {
    const id = activeSessionIdRef.current || currentConversationIdRef.current;
    if (!id || renameSaving) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      // Blocked client-side, editor stays open with the words intact.
      setRenameError("Title can't be blank");
      return;
    }
    setRenameSaving(true);
    setRenameError(null);
    try {
      const res = await patchOpalConversationTitle(id, trimmed, bearer);
      const returned = res.conversation;
      if (returned && returned.id) {
        // Re-render from the RETURNED summary only: it replaces this
        // chat's entry in the one sessions list the header title and
        // the chats list both consume, and it is the header's title
        // source when no list entry drives it. No second fetch.
        if (sessionsRef.current) {
          sessionsRef.current = sessionsRef.current.some((s) => s.id === returned.id)
            ? sessionsRef.current.map((s) => (s.id === returned.id ? returned : s))
            : [returned, ...sessionsRef.current];
          setSessions(sessionsRef.current);
        }
        setConversationTitle(
          typeof returned.title === "string" ? returned.title : null,
        );
      }
      setRenaming(false);
      setRenameDraft("");
    } catch (err) {
      // The server did not accept this title: the editor stays open
      // with the text intact, its message shows inline (the 422 field
      // message when the server sent one), and the old title stands
      // everywhere - header, list, and destination pill.
      const serverMessage = opalConversationTitleError(err);
      setRenameError(
        serverMessage
          ? /^[a-z]/.test(serverMessage)
            ? `Title ${serverMessage}`
            : serverMessage
          : "Could not rename this chat. Try again.",
      );
    } finally {
      setRenameSaving(false);
    }
  }, [bearer, renameDraft, renameSaving]);

  // One intelligence path: rest composer / chips hand utterance here once hydrated.
  // Repair #18: when the parent marks the seed as a draft (seedAsDraft),
  // the seed is NEVER auto-sent. With intent "new" it first creates a
  // real new chat and lands there as that chat's draft; the previous
  // chat keeps its messages, draft, and place in the list.
  const seedHandledRef = useRef(false);
  useEffect(() => {
    if (loading || loadError || sending) return;
    if (initialSentRef.current) return;
    const seed = (initialMessageRef.current || "").trim();
    if (!seed) return;
    if (!seedAsDraft) {
      initialSentRef.current = true;
      void sendBody(seed);
      return;
    }
    if (seedHandledRef.current) return;
    seedHandledRef.current = true;
    initialSentRef.current = true;
    void (async () => {
      if (initialChatIntent === "new" && sessionsModeRef.current) {
        await onNewChat();
      }
      draftRef.current = seed;
      setDraft(seed);
      const key = chatStateKey();
      const prev = perChatRef.current.get(key);
      perChatRef.current.set(key, {
        draft: seed,
        scrollTop: prev?.scrollTop ?? null,
        stick: prev?.stick ?? true,
      });
      requestAnimationFrame(() => inputRef.current?.focus());
    })();
  }, [loading, loadError, sending, sendBody, seedAsDraft, initialChatIntent, onNewChat, chatStateKey]);

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    void sendBody(draft);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim()) void sendBody(draft);
    }
  };

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceModeState(next);
    setVoiceMode(resolveVoiceUserId(userId), next);
    if (!next) stopSpeaking();
  };

  const sttReady = isSttAvailable();

  const onMicTap = async () => {
    setVoiceHint(null);

    // Interrupt TTS immediately when user taps mic.
    stopSpeaking();

    if (listening) {
      stopListening();
      setListening(false);
      return;
    }

    if (!online || !isOnline()) {
      setVoiceHint(VOICE_OFFLINE_COPY);
      return;
    }

    // No STT path: mic is already disabled with honest aria — never red-banner after tap.
    if (!isSttAvailable()) {
      return;
    }

    // Never short-circuit on probeMicPermission("denied") — iOS false-denies.
    // Attempt listenOnce; only show Settings copy after a real STT denial.
    setListening(true);
    setVoiceHint(null);
    try {
      const result = await listenOnce();
      setListening(false);
      if (result.status === "ok") {
        setMicPermission("granted");
        setDraft((prev) => {
          const next = prev.trim() ? `${prev.trim()} ${result.text}` : result.text;
          return next.slice(0, MAX_BODY);
        });
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      if (result.status === "denied") {
        setMicPermission("denied");
        setVoiceHint(MIC_BLOCKED_COPY);
        return;
      }
      if (result.status === "offline") {
        setVoiceHint(VOICE_OFFLINE_COPY);
        return;
      }
      if (result.status === "empty") {
        setVoiceHint(STT_FAIL_COPY);
        return;
      }
      if (result.status === "unavailable") {
        // Capability disappeared mid-session — keep copy calm, not a red panic banner.
        setVoiceHint(result.message || VOICE_UNAVAILABLE_COPY);
        return;
      }
      setVoiceHint(result.message || STT_FAIL_COPY);
    } catch {
      setListening(false);
      setVoiceHint(STT_FAIL_COPY);
    }
  };

  const startLongPress = (key: string) => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => setShowTimeKey(key), 450);
  };

  const endLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const hasText = draft.trim().length > 0;
  const empty = !loading && !loadError && messages.length === 0 && !sending;

  // Repair #16 W3 — resolve the birthday honoree's name (from the
  // latest birthday-plan turn) to the owner's relationship contact.
  // Fail closed: no unique contact match → no assess, no ask, and the
  // plan flow is untouched either way.
  const birthdayPersonName = birthdayPersonNameFromMessages(messages);
  useEffect(() => {
    if (!birthdayPersonName) {
      setGapPerson(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await listRelationships(bearer);
        if (cancelled) return;
        const wanted = birthdayPersonName.toLowerCase();
        const contacts = (res.contacts || []).filter(
          (c) => !!c.contact_user_id && typeof c.display_name === "string",
        );
        const exact = contacts.filter((c) => c.display_name!.trim().toLowerCase() === wanted);
        const byFirstName = contacts.filter(
          (c) => c.display_name!.trim().toLowerCase().split(/\s+/)[0] === wanted,
        );
        const match = exact.length === 1 ? exact[0] : byFirstName.length === 1 ? byFirstName[0] : null;
        setGapPerson(
          match ? { id: match.contact_user_id, name: match.display_name!.trim() } : null,
        );
      } catch {
        if (!cancelled) setGapPerson(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [birthdayPersonName, bearer]);
  // Offline / no STT path: disable before tap. Real denial only after listenOnce fails.
  const micOfflineBlocked = !online && !listening;
  const micUnavailable = !sttReady && !listening;
  const micLooksDisabled =
    micPermission === "denied" || micOfflineBlocked || micUnavailable;
  const micTooltip =
    micPermission === "denied"
      ? "Mic blocked. Enable in Settings"
      : micUnavailable
        ? VOICE_UNAVAILABLE_COPY
        : !online
          ? VOICE_OFFLINE_COPY
          : listening
            ? "Stop voice input"
            : "Talk to Opal";

  // Repair #17 W6 — real "Opal is still working" signal for the header
  // character: a provider action queued/running on an Opal reply (the
  // same signal the poll loop above chases). Never inferred from timers.
  const providerWorking = messages.some(
    (m) =>
      m.role === "opal" &&
      (m.metadata?.action_state === "queued" || m.metadata?.action_state === "running"),
  );

  // Repair #18 (G-IA2/G-IA6) - the open chat's identity: its distinct
  // list label when sessions are known (title, else preview, else a
  // date fallback), else the loaded conversation's own title. Rename
  // renders now that the title-update endpoint is in the contract
  // (PATCH /opal/conversations/:id), and only when a real conversation
  // id is known - a rename control that writes nothing is banned.
  const activeChatTitle = (() => {
    if (sessions && activeSessionId) {
      const label = distinctSessionLabels(sessions).get(activeSessionId);
      if (label) return label;
    }
    const own = (conversationTitle || "").trim();
    if (own) return own;
    if (activeSessionId && sessions) {
      const summary = sessions.find((s) => s.id === activeSessionId);
      if (summary) return sessionRowLabel(summary);
    }
    return "New chat";
  })();

  const renameTargetId = activeSessionId || currentConversationIdRef.current;

  return (
    <section className="opal-center-chat" data-testid="opal-center-chat">
      <header className="opal-center-chat-header">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="opal-center-chat-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
        <div className="opal-center-chat-presence">
          <OpalLivingCharacter
            size={64}
            testId="opal-center-chat-presence"
            requestInFlight={sending || providerWorking}
            audioPlaying={audioPlaying}
            externalListening={listening}
            voiceEnabled={online && sttReady}
            onTranscript={(text) => {
              void sendBody(text);
            }}
          />
        </div>
        <div className="opal-center-chat-title-zone">
          {renaming ? (
            <form
              className="opal-center-chat-rename"
              data-testid="center-chat-rename"
              onSubmit={(e) => {
                e.preventDefault();
                void saveRename();
              }}
            >
              <div className="opal-center-chat-rename-row">
                <input
                  ref={renameInputRef}
                  className="opal-center-chat-rename-input"
                  data-testid="center-chat-rename-input"
                  type="text"
                  value={renameDraft}
                  maxLength={120}
                  aria-label="Chat title"
                  aria-invalid={renameError ? "true" : undefined}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                />
                <button
                  type="submit"
                  className="opal-center-chat-rename-save"
                  data-testid="center-chat-rename-save"
                  disabled={renameSaving}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="opal-center-chat-rename-cancel"
                  data-testid="center-chat-rename-cancel"
                  onClick={cancelRename}
                >
                  Cancel
                </button>
              </div>
              {renameError ? (
                <p
                  className="opal-center-chat-rename-error"
                  data-testid="center-chat-rename-error"
                  role="alert"
                >
                  {renameError}
                </p>
              ) : null}
            </form>
          ) : (
            <>
              <h2
                className="opal-center-chat-title"
                data-testid="center-chat-title"
                onClick={renameTargetId ? startRename : undefined}
              >
                {activeChatTitle}
              </h2>
              {renameTargetId ? (
                <button
                  type="button"
                  className="opal-center-chat-rename-btn"
                  data-testid="center-chat-rename-button"
                  aria-label={`Rename chat: ${activeChatTitle}`}
                  onClick={startRename}
                >
                  Edit
                </button>
              ) : null}
            </>
          )}
        </div>
        <div className="opal-center-chat-header-actions">
          <button
            type="button"
            className="opal-center-chat-chats-btn"
            data-testid="center-chats-button"
            onClick={() => {
              setMenuOpen(false);
              setSessionsOpen(true);
              if (sessions === null) void refreshSessions();
            }}
          >
            Chats
          </button>
          <button
            type="button"
            className="opal-center-chat-new-btn"
            data-testid="center-new-chat"
            onClick={() => void onNewChat()}
          >
            New chat
          </button>
          <button
            type="button"
            className="opal-center-chat-menu-toggle"
            data-testid="opal-center-chat-menu"
            aria-label="Conversation menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((v) => !v);
              setClearConfirm(false);
            }}
          >
            ···
          </button>
          <button
            type="button"
            className={`opal-center-chat-voice-toggle${voiceMode ? " is-on" : ""}`}
            data-testid="opal-center-chat-voice-toggle"
            aria-label={voiceMode ? "Voice replies on" : "Voice replies off"}
            aria-pressed={voiceMode}
            title={voiceMode ? "Voice replies on" : "Voice replies off"}
            onClick={toggleVoiceMode}
          >
            <SpeakerIcon on={voiceMode} />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="opal-center-chat-menu" data-testid="opal-center-chat-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-chat-new"
            onClick={() => void onNewChat()}
          >
            New chat
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-chat-sessions"
            onClick={() => {
              setMenuOpen(false);
              setSessionsOpen(true);
              if (sessions === null) void refreshSessions();
            }}
          >
            All chats
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-chat-clear"
            onClick={onClearConversation}
          >
            Clear this chat
          </button>
        </div>
      ) : null}

      <OpalChatSessionsDrawer
        open={sessionsOpen}
        sessions={sessions}
        loadFailed={sessionsFailed}
        activeSessionId={activeSessionId}
        onClose={() => setSessionsOpen(false)}
        onSelect={(id) => void selectSession(id)}
        onNewChat={() => void onNewChat()}
        onRetry={() => void refreshSessions()}
      />

      {clearConfirm ? (
        <div
          className="opal-center-chat-clear-confirm"
          data-testid="opal-center-chat-clear-confirm"
          role="alertdialog"
          aria-label="Clear this chat"
        >
          <p>
            Clear this chat? Every message in this conversation will be deleted.
            Plans you made stay on your Graph.
          </p>
          {clearError ? (
            <p role="alert" data-testid="opal-center-chat-clear-error">
              Couldn&apos;t clear this chat. Nothing was deleted. Try again.
            </p>
          ) : null}
          <div className="opal-center-chat-clear-actions">
            <button
              type="button"
              className="opal-center-chat-clear-do"
              data-testid="opal-center-chat-clear-confirm-btn"
              onClick={() => void confirmClearConversation()}
            >
              Clear chat
            </button>
            <button
              type="button"
              data-testid="opal-center-chat-clear-cancel"
              onClick={() => {
                setClearConfirm(false);
                setClearError(false);
              }}
            >
              Keep messages
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="opal-center-chat-thread"
        data-testid="opal-center-chat-thread"
        ref={threadRef}
        onScroll={onThreadScroll}
      >
        {loading && messages.length === 0 ? (
          <div className="opal-center-chat-skeleton" data-testid="opal-center-chat-skeleton">
            <div className="bubble-row in opal-center-chat-skel-row">
              <div className="bubble in opal-center-chat-skel-bubble" />
            </div>
            <div className="bubble-row out opal-center-chat-skel-row">
              <div className="bubble out opal-center-chat-skel-bubble" />
            </div>
            <div className="bubble-row in opal-center-chat-skel-row">
              <div className="bubble in opal-center-chat-skel-bubble is-short" />
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="opal-center-chat-error" data-testid="opal-center-chat-load-error">
            <p>{LOAD_FAIL}</p>
            <button
              type="button"
              className="opal-center-v2-chip"
              data-testid="opal-center-chat-retry-load"
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {empty ? (
          <div className="opal-center-chat-empty" data-testid="opal-center-chat-empty">
            <p className="opal-center-chat-empty-copy">{EMPTY_COPY}</p>
            <div className="opal-center-v2-quick" role="group" aria-label="Suggestions">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="opal-center-v2-chip"
                  data-testid={`opal-center-chat-chip-${chip}`}
                  onClick={() => void sendBody(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && !loadError
          ? messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.key}
                  className={`bubble-row ${isUser ? "out" : "in"}`}
                  data-testid={isUser ? "opal-center-chat-user-msg" : "opal-center-chat-opal-msg"}
                  data-msg-status={m.status || "sent"}
                  onPointerDown={() => startLongPress(m.key)}
                  onPointerUp={endLongPress}
                  onPointerLeave={endLongPress}
                  onPointerCancel={endLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowTimeKey(m.key);
                  }}
                >
                  {!isUser ? (
                    <div className="bubble-speaker-col" aria-hidden>
                      <span className="opal-center-chat-opal-avatar">
                        <MeridianGlobeMark size={24} />
                      </span>
                    </div>
                  ) : null}
                  <div className="bubble-stack">
                    <div className={`bubble ${isUser ? "out" : "in"}`}>
                      <p>{m.body}</p>
                      {showTimeKey === m.key && m.inserted_at ? (
                        <time dateTime={m.inserted_at}>{formatTime(m.inserted_at)}</time>
                      ) : null}
                    </div>
                    {!isUser &&
                    (m.metadata?.action_state === "queued" ||
                      m.metadata?.action_state === "running") ? (
                      <div
                        className="opal-center-action-working"
                        data-testid="opal-center-action-working"
                        role="status"
                      >
                        <span className="opal-center-action-working-pulse" aria-hidden />
                        Checking {String(m.metadata.search_geography || "places")}…
                      </div>
                    ) : null}
                    {!isUser
                      ? (() => {
                          const opts = optionsFromMeta(m.metadata);
                          if (opts.length === 0) return null;
                          return (
                            <div
                              className="opal-center-option-set"
                              data-testid="opal-center-option-set"
                            >
                              {opts.map((opt, idx) => (
                                <button
                                  key={opt.id || `${opt.name}-${idx}`}
                                  type="button"
                                  className="opal-center-option-card"
                                  data-testid="opal-center-option-card"
                                  onClick={() =>
                                    void sendBody(
                                      `Let's go with ${opt.name}${
                                        opt.address ? ` (${opt.address})` : ""
                                      }.`,
                                    )
                                  }
                                >
                                  <span className="opal-center-option-name">{opt.name}</span>
                                  {opt.cuisine ? (
                                    <span className="opal-center-option-meta">{opt.cuisine}</span>
                                  ) : null}
                                  {opt.address ? (
                                    <span className="opal-center-option-addr">{opt.address}</span>
                                  ) : null}
                                </button>
                              ))}
                              {typeof m.metadata?.attribution === "string" ? (
                                <p className="opal-center-option-attr">{m.metadata.attribution}</p>
                              ) : null}
                            </div>
                          );
                        })()
                      : null}
                    {m.status === "failed" ? (
                      <button
                        type="button"
                        className="opal-center-chat-send-error"
                        data-testid="opal-center-chat-send-error"
                        data-failure={m.failure || "generic"}
                        onClick={() => void sendBody(m.body, m.key)}
                      >
                        {m.failure === "throttled" ? SEND_THROTTLED : SEND_FAIL}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          : null}

        {sending ? (
          <div
            className="bubble-row in opal-center-chat-typing"
            data-testid="opal-center-chat-typing"
            aria-label="Opal is typing"
          >
            <div className="bubble-speaker-col" aria-hidden>
              <span className="opal-center-chat-opal-avatar">
                <MeridianGlobeMark size={24} />
              </span>
            </div>
            <div className="bubble-stack">
              <div className="bubble in opal-center-chat-typing-bubble">
                <span className="opal-center-chat-typing-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {gapPerson ? (
        <ProfileGapAsk
          key={gapPerson.id}
          personId={gapPerson.id}
          personName={gapPerson.name}
          bearer={bearer}
        />
      ) : null}

      {/* Repair #18 B3 — check-in sweep cards ride the OpalMessage
          metadata (source checkin_sweep): a member's private ask
          card, and the organizer's live summary card. Both render
          the server projection; neither derives sweep state. */}
      {(() => {
        // One card per distinct sweep in this thread: a member can
        // hold open asks from more than one circle at once, and
        // rendering only the latest would hide the earlier asks.
        const bySweep = new Map<string, string | undefined>();
        for (const m of messages) {
          if (
            m.metadata?.source === "checkin_sweep" &&
            typeof m.metadata?.sweep_id === "string"
          ) {
            bySweep.set(String(m.metadata.sweep_id), m.metadata?.kind as string | undefined);
          }
        }
        if (bySweep.size === 0) return null;
        return [...bySweep.entries()].map(([sweepId, kind]) =>
          kind === "ask" ? (
            <CheckinAskCard key={sweepId} sweepId={sweepId} bearer={bearer} />
          ) : (
            <CheckinSummaryCard key={sweepId} sweepId={sweepId} bearer={bearer} />
          ),
        );
      })()}

      {showJump ? (
        <button
          type="button"
          className="opal-center-chat-jump-latest"
          data-testid="opal-center-chat-jump-latest"
          // preventDefault on pointerdown keeps focus from moving when Jump
          // unmounts — focus restoration was snapping scrollTop back to 0.
          onPointerDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const node = threadRef.current;
            if (node) {
              node.dataset.jumpFired = String(Date.now());
              stickToBottomRef.current = true;
              programmaticScrollRef.current = true;
              jumpLockUntilRef.current = Date.now() + 1600;
              const max = Math.max(0, node.scrollHeight - node.clientHeight);
              node.scrollTop = max;
            }
            scrollToEnd(true);
          }}
        >
          Jump to latest
        </button>
      ) : null}

      {voiceHint ? (
        <p className="opal-center-chat-voice-hint" data-testid="opal-center-chat-voice-hint" role="status">
          {voiceHint}
        </p>
      ) : null}

      <div
        className="opal-center-destination-pill"
        data-testid="center-destination-pill"
        role="status"
      >
        In: {activeChatTitle}
      </div>

      <form
        className={`opal-composer opal-center-v2-composer opal-center-chat-composer${
          listening ? " is-listening" : ""
        }`}
        data-testid="opal-center-chat-composer"
        onSubmit={onSubmit}
      >
        <button
          type="button"
          className={`opal-center-chat-mic${listening ? " is-recording" : ""}${
            micLooksDisabled ? " is-disabled" : ""
          }`}
          data-testid="opal-center-chat-mic"
          aria-label={micTooltip}
          title={micTooltip}
          aria-pressed={listening}
          disabled={micOfflineBlocked || micUnavailable}
          onClick={() => void onMicTap()}
        >
          {listening ? (
            <span className="opal-center-chat-mic-pulse" aria-hidden>
              <i />
            </span>
          ) : (
            <MicIcon />
          )}
        </button>
        <label className="sr-only" htmlFor="opal-center-chat-input">
          Talk to Opal
        </label>
        <textarea
          id="opal-center-chat-input"
          ref={inputRef}
          className="opal-query opal-center-chat-input"
          data-testid="opal-center-chat-input"
          value={draft}
          rows={1}
          maxLength={MAX_BODY}
          placeholder={listening ? LISTENING_COPY : PLACEHOLDER}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="submit"
          className="opal-center-send"
          data-testid="opal-center-chat-send"
          aria-label={queuedCount > 0 ? `Send (${queuedCount} queued)` : "Send"}
          data-queued={queuedCount > 0 ? String(queuedCount) : undefined}
          data-sending={sending ? "true" : undefined}
          disabled={!hasText}
        >
          <SendArrow />
        </button>
      </form>
    </section>
  );
}
