/**
 * Phase OC-1 / OC-6 — Opal Center conversational shell.
 * OC-6 adds native STT/TTS (mic + speak-back). Text pipeline unchanged.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  clearOpalConversation,
  getOpalConversation,
  listRelationships,
  postOpalMessage,
  startOpalNewChat,
  type OpalChatMessage,
} from "../api/productClient";
import { ProfileGapAsk } from "./ProfileGapAsk";
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
  planFromLocalConfirm,
  planFromOpalMetadata,
  type CreatedPlanSurface,
} from "./graphSurfaceInterop";
import { isFounderSeedEnabled } from "./founderGraphSeed";
import { OpalLivingCharacter } from "./OpalLivingCharacter";
import { readFitSliceForOpal } from "./fitPreferences";

const PLACEHOLDER = "Talk to Opal…";
const EMPTY_COPY = "Say hello to Opal";
/** Pass 2 memory intelligence LOCKED — no "Remember something" consumer chip. */
const CHIPS = ["Plan something", "What's coming up?"] as const;
const SEND_FAIL = "Couldn't send. Tap to retry";
const LOAD_FAIL = "Couldn't load conversation";
const MAX_BODY = 2000;
const MAX_LINES = 5;

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
  metadata?: Record<string, unknown> | null;
};

type Props = {
  onBack: () => void;
  bearer?: string;
  /** Optional user id for per-user voice-mode persistence. */
  userId?: string | null;
  /** Fired when a plan is confirmed (backend metadata or founder-seed local). */
  onPlanCreated?: (plan: CreatedPlanSurface) => void;
  /**
   * Repair #4 — rest composer / chips converge here.
   * When set, auto-send once after conversation hydrate (one intelligence path).
   */
  initialMessage?: string | null;
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
  const lastUserPlanAsk = useRef<string | null>(null);
  const surfacedPlanIds = useRef<Set<string>>(new Set());
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
  const NEAR_BOTTOM_PX = 96;

  // Holistic loop: when founder-seed thread shows plan-ask → Yes, surface a plan
  // even if the backend replied with generic chat (no plan_confirm metadata).
  useEffect(() => {
    if (!isFounderSeedEnabled()) return;
    if (!onPlanCreatedRef.current) return;
    const users = messages.filter((m) => m.role === "user" && m.status !== "failed");
    if (users.length < 2) return;
    const latest = users[users.length - 1];
    if (!latest || !/^(yes|yeah|yep|sure|ok|okay)\b/i.test(latest.body.trim())) return;
    const prior = [...users]
      .slice(0, -1)
      .reverse()
      .find((m) =>
        /\b(plan|dinner|brunch|lunch|beach|coffee|drinks|hike|walk)\b/i.test(m.body),
      );
    if (!prior) return;
    const local = planFromLocalConfirm({
      priorUserText: prior.body,
      affirmText: latest.body,
    });
    if (!local || surfacedPlanIds.current.has(local.id)) return;
    surfacedPlanIds.current.add(local.id);
    lastUserPlanAsk.current = null;
    onPlanCreatedRef.current(local);
  }, [messages]);

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
  }, []);

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

  // Poll while a provider action is queued/running so RESULTS_READY options appear.
  useEffect(() => {
    const waiting = messages.some(
      (m) =>
        m.role === "opal" &&
        (m.metadata?.action_state === "queued" || m.metadata?.action_state === "running"),
    );
    if (!waiting) return;
    const t = window.setInterval(() => {
      void (async () => {
        try {
          const res = await getOpalConversation(bearer);
          const list = Array.isArray(res.conversation?.messages)
            ? res.conversation.messages.map(fromServer)
            : [];
          setMessages(list);
        } catch {
          /* keep prior messages */
        }
      })();
    }, 1800);
    return () => window.clearInterval(t);
  }, [messages, bearer]);

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
      const fit = readFitSliceForOpal(userId);
      const res = fit
        ? await postOpalMessage(body, bearer, { clientContext: { fit } })
        : await postOpalMessage(body, bearer);
      const rawMsgs = Array.isArray(res.messages) ? res.messages : [];
      const serverMsgs = rawMsgs.map(fromServer);
      setMessages((prev) => {
        const without = prev.filter((m) => m.key !== optimisticKey);
        return [...without, ...serverMsgs];
      });
      let surfaced = false;
      for (const m of rawMsgs) {
        if (m.role !== "opal") continue;
        const fromMeta = planFromOpalMetadata(
          (m.metadata || null) as Record<string, unknown> | null,
        );
        if (fromMeta) {
          emitPlanIfAny(fromMeta);
          surfaced = true;
          lastUserPlanAsk.current = null;
          break;
        }
      }
      if (!surfaced && isFounderSeedEnabled() && lastUserPlanAsk.current) {
        const local = planFromLocalConfirm({
          priorUserText: lastUserPlanAsk.current,
          affirmText: body,
        });
        if (local) {
          emitPlanIfAny(local);
          lastUserPlanAsk.current = null;
        }
      }
    } catch {
      if (isFounderSeedEnabled() && lastUserPlanAsk.current) {
        const local = planFromLocalConfirm({
          priorUserText: lastUserPlanAsk.current,
          affirmText: body,
        });
        if (local) {
          emitPlanIfAny(local);
          lastUserPlanAsk.current = null;
          setMessages((prev) => {
            const without = prev.filter((m) => m.key !== optimisticKey);
            return [
              ...without,
              { key: optimisticKey, role: "user", body, status: "sent" },
              {
                key: `local-opal-${Date.now()}`,
                role: "opal",
                body: `Done. ${local.title}${local.when ? ` · ${local.when}` : ""} is on your Graph.`,
                status: "sent",
              },
            ];
          });
          sendQueueRef.current.shift();
          flushingRef.current = false;
          requestAnimationFrame(() => inputRef.current?.focus());
          void flushSendQueue();
          return;
        }
      }
      setMessages((prev) => {
        const exists = prev.some((m) => m.key === optimisticKey);
        if (!exists) {
          return [...prev, { key: optimisticKey, role: "user", body, status: "failed" }];
        }
        return prev.map((m) =>
          m.key === optimisticKey ? { ...m, status: "failed" } : m,
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

      const looksLikePlanAsk =
        /\b(plan|dinner|brunch|lunch|hike|coffee|drinks)\b/i.test(body) &&
        /\b(with|for|[A-Z][a-z]+)\b/.test(body);
      if (looksLikePlanAsk) lastUserPlanAsk.current = body;

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
    setDraft("");
    stickToBottomRef.current = true;
    setShowJump(false);
    setMenuOpen(false);
    setClearConfirm(false);
    spokenIds.current = new Set();
    surfacedPlanIds.current.clear();
    lastUserPlanAsk.current = null;
  }, []);

  const onNewChat = useCallback(async () => {
    setMenuOpen(false);
    try {
      await startOpalNewChat(bearer);
      resetLocalChatState();
    } catch {
      /* keep prior messages on failure */
    }
  }, [bearer, resetLocalChatState]);

  const onClearConversation = useCallback(async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    try {
      await clearOpalConversation(bearer);
      resetLocalChatState();
    } catch {
      setClearConfirm(false);
    }
  }, [bearer, clearConfirm, resetLocalChatState]);

  // One intelligence path: rest composer / chips hand utterance here once hydrated.
  useEffect(() => {
    if (loading || loadError || sending) return;
    if (initialSentRef.current) return;
    const seed = (initialMessageRef.current || "").trim();
    if (!seed) return;
    initialSentRef.current = true;
    void sendBody(seed);
  }, [loading, loadError, sending, sendBody]);

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
            ? "Stop listening"
            : "Talk to Opal";

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
            requestInFlight={sending}
            audioPlaying={audioPlaying}
            voiceEnabled={online && sttReady}
            onTranscript={(text) => {
              void sendBody(text);
            }}
          />
        </div>
        <div className="opal-center-chat-header-actions">
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
            New Chat
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-chat-clear"
            onClick={() => void onClearConversation()}
          >
            {clearConfirm ? "Confirm clear visible history" : "Clear Conversation"}
          </button>
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
                        onClick={() => void sendBody(m.body, m.key)}
                      >
                        {SEND_FAIL}
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
