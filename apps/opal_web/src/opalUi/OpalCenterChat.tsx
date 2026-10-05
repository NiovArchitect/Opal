/**
 * Phase OC-1 — Opal Center conversational shell (text chat + history).
 * Intelligence (context/intent/smart replies) arrives in OC-2/OC-3/OC-4.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getOpalConversation,
  postOpalMessage,
  type OpalChatMessage,
} from "../api/productClient";

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

export function OpalCenterChat({ onBack, bearer }: Props) {
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTimeKey, setShowTimeKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const loadGen = useRef(0);
  const hydrated = useRef(false);

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
    };
  }, [load]);

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

  const sendBody = useCallback(
    async (raw: string, retryKey?: string) => {
      const body = raw.trim().slice(0, MAX_BODY);
      if (!body || sending) return;

      // Invalidate in-flight history fetches so a late GET cannot wipe local rows.
      loadGen.current += 1;
      setLoading(false);
      setLoadError(false);

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
        const serverMsgs = Array.isArray(res.messages) ? res.messages.map(fromServer) : [];
        setMessages((prev) => {
          const without = prev.filter((m) => m.key !== optimisticKey);
          return [...without, ...serverMsgs];
        });
      } catch {
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
    [bearer, sending],
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
        <span className="opal-center-chat-header-spacer" aria-hidden />
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

      <form
        className="opal-composer opal-center-v2-composer opal-center-chat-composer"
        data-testid="opal-center-chat-composer"
        onSubmit={onSubmit}
      >
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
          placeholder={PLACEHOLDER}
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
