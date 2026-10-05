/**
 * Phase OC-1 / OC-6 — Opal Center conversational shell.
 * OC-6 adds native STT/TTS (mic + speak-back). Text pipeline unchanged.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getOpalConversation,
  postOpalMessage,
  type OpalChatMessage,
} from "../api/productClient";
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

const PLACEHOLDER = "Talk to Opal…";
const EMPTY_COPY = "Say hello to Opal";
const CHIPS = ["Plan something", "Remember something", "What's coming up?"] as const;
const SEND_FAIL = "Couldn't send — tap to retry";
const LOAD_FAIL = "Couldn't load conversation";
const MAX_BODY = 2000;
const MAX_LINES = 5;

type LocalMsg = {
  key: string;
  id?: string;
  role: "user" | "opal";
  body: string;
  inserted_at?: string | null;
  status?: "pending" | "sent" | "failed";
};

type Props = {
  onBack: () => void;
  bearer?: string;
  /** Optional user id for per-user voice-mode persistence. */
  userId?: string | null;
  /** Fired when a plan is confirmed (backend metadata or founder-seed local). */
  onPlanCreated?: (plan: CreatedPlanSurface) => void;
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
  };
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

export function OpalCenterChat({ onBack, bearer, userId, onPlanCreated }: Props) {
  const voiceUserId = resolveVoiceUserId(userId);
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTimeKey, setShowTimeKey] = useState<string | null>(null);
  const [voiceMode, setVoiceModeState] = useState(() => getVoiceMode(voiceUserId));
  const [listening, setListening] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("prompt");
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [online, setOnline] = useState(() => isOnline());
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
      .find((m) => /\b(plan|dinner|brunch|lunch)\b/i.test(m.body));
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

  const scrollToEnd = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

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
    scrollToEnd();
  }, [messages, sending, scrollToEnd]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const line = 20;
    const max = line * MAX_LINES;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [draft]);

  // Speak new Opal replies when voice mode is on.
  useEffect(() => {
    if (!voiceMode) return;
    const newest = [...messages].reverse().find((m) => m.role === "opal" && m.status !== "failed");
    if (!newest) return;
    const id = newest.id || newest.key;
    if (spokenIds.current.has(id)) return;
    if (newest.status === "pending") return;
    spokenIds.current.add(id);
    void speakText(newest.body);
  }, [messages, voiceMode]);

  const emitPlanIfAny = useCallback((plan: CreatedPlanSurface | null) => {
    if (!plan) return;
    onPlanCreatedRef.current?.(plan);
  }, []);

  const sendBody = useCallback(
    async (raw: string, retryKey?: string) => {
      const body = raw.trim().slice(0, MAX_BODY);
      if (!body || sending) return;

      stopSpeaking();
      stopListening();
      setListening(false);

      // Invalidate in-flight history fetches so a late GET cannot wipe local rows.
      loadGen.current += 1;
      setLoading(false);
      setLoadError(false);

      const looksLikePlanAsk =
        /\b(plan|dinner|brunch|lunch|hike|coffee|drinks)\b/i.test(body) &&
        /\b(with|for|[A-Z][a-z]+)\b/.test(body);
      if (looksLikePlanAsk) lastUserPlanAsk.current = body;

      const optimisticKey = retryKey || `local-${Date.now()}`;
      if (!retryKey) {
        setDraft("");
        setMessages((prev) => [
          ...prev,
          { key: optimisticKey, role: "user", body, status: "pending" },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.key === retryKey ? { ...m, status: "pending" } : m)),
        );
      }

      setSending(true);
      try {
        const res = await postOpalMessage(body, bearer);
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
        // Founder-seed local confirm when backend has no peer / no plan_id yet.
        if (!surfaced && isFounderSeedEnabled()) {
          const priorAsk =
            lastUserPlanAsk.current ||
            [...messages]
              .reverse()
              .find(
                (m) =>
                  m.role === "user" &&
                  /\b(plan|dinner|brunch|lunch)\b/i.test(m.body || ""),
              )?.body ||
            null;
          if (priorAsk) {
            const local = planFromLocalConfirm({
              priorUserText: priorAsk,
              affirmText: body,
            });
            if (local) {
              emitPlanIfAny(local);
              lastUserPlanAsk.current = null;
              surfaced = true;
            }
          }
        }
      } catch {
        // Founder-seed: still surface a local plan on Yes so the holistic loop works offline.
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
                  body: `Done — ${local.title}${local.when ? ` · ${local.when}` : ""} is on your Graph.`,
                  status: "sent",
                },
              ];
            });
            setSending(false);
            requestAnimationFrame(() => inputRef.current?.focus());
            return;
          }
        }
        setDraft((d) => (d.trim() ? d : body));
        setMessages((prev) => {
          const exists = prev.some((m) => m.key === optimisticKey);
          if (!exists) {
            return [
              ...prev,
              { key: optimisticKey, role: "user", body, status: "failed" },
            ];
          }
          return prev.map((m) =>
            m.key === optimisticKey ? { ...m, status: "failed" } : m,
          );
        });
      } finally {
        setSending(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [bearer, sending, emitPlanIfAny],
  );

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
  // Offline / no STT path: disable before tap. Real denial only after listenOnce fails.
  const micOfflineBlocked = !online && !listening;
  const micUnavailable = !sttReady && !listening;
  const micLooksDisabled =
    micPermission === "denied" || micOfflineBlocked || micUnavailable;
  const micTooltip =
    micPermission === "denied"
      ? "Mic blocked — enable in Settings"
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
        <h1 className="opal-center-chat-title">Opal</h1>
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
      </header>

      <div
        className="opal-center-chat-thread"
        data-testid="opal-center-chat-thread"
        ref={threadRef}
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
          aria-label="Send"
          disabled={!hasText || sending}
        >
          <SendArrow />
        </button>
      </form>
    </section>
  );
}
