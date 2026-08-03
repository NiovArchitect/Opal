import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CHATS,
  INITIAL_NEEDS,
  PLANS,
  THREADS,
  type ChatPreview,
  type Message,
  type NeedItem,
} from "./data";
import { PRODUCT_COPY } from "./designTokens";
import { OpalLockup, OpalMark } from "./brand/OpalLogo";
import { FIRST_RUN_STORAGE_KEY } from "./brand/brand";
import { FirstRunExperience } from "./onboarding/FirstRunExperience";
import { ActivationFlow } from "./ActivationFlow";
import {
  apiConfigured,
  fetchSession,
  listConversations,
  listMessages,
  loadSession,
  saveSession,
  setMemoryAccessToken,
  sendMessage,
  signOut,
  type ProductSession,
  type ProductSignal,
} from "./api/productClient";

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
  const [needs, setNeeds] = useState<NeedItem[]>(INITIAL_NEEDS);
  const [draft, setDraft] = useState("");
  const [threads, setThreads] = useState<Record<string, Message[]>>(THREADS);
  const [chats, setChats] = useState<ChatPreview[]>(CHATS);
  const [showFirstRun, setShowFirstRun] = useState(() => !readFirstRunDone());
  const [session, setSession] = useState<ProductSession | null>(() => loadSession());
  const [authReady, setAuthReady] = useState(false);
  const [liveSignals, setLiveSignals] = useState<ProductSignal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const authenticated = Boolean(session?.user_id);

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
      const mapped: ChatPreview[] = data.conversations.map((c) => ({
        id: c.id,
        name: c.title,
        preview: c.preview || "No messages yet",
        time: c.updated_at ? new Date(c.updated_at).toLocaleString() : "",
        contextLine: c.peers.map((p) => p.display_name).join(", ") || undefined,
        signalLabel: data.signals.find((sig) => sig.conversation_id === c.id)?.label,
        signal: data.signals.find((sig) => sig.conversation_id === c.id)
          ? "plan_forming"
          : undefined,
      }));
      setChats(mapped);
      setLiveSignals(data.signals || []);
      setNeeds(
        (data.signals || []).map((sig, i) => ({
          id: `sig-${i}`,
          title: sig.label,
          detail: sig.evidence_preview || "From your conversation",
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session) {
        if (!cancelled) setAuthReady(true);
        return;
      }
      if (session.access_token) setMemoryAccessToken(session.access_token);
      if (apiConfigured() && session.access_token) {
        try {
          const me = await fetchSession(session.access_token);
          if (!cancelled && me.user?.id) {
            const next = {
              ...session,
              user_id: me.user.id,
              display_name: me.user.display_name,
              handle: me.user.handle,
            };
            setSession(next);
            saveSession(next);
          }
        } catch {
          /* keep tab session */
        }
      }
      if (!cancelled) await refreshLive(session);
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally keyed on identity + token only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user_id, session?.access_token]);

  const completeFirstRun = () => {
    writeFirstRunDone();
    setShowFirstRun(false);
  };

  const openChat = async (id: string) => {
    setActiveChatId(id);
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setDraft("");
    if (session) {
      try {
        const data = await listMessages(id, session.access_token);
        const mapped: Message[] = data.messages.map((m) => ({
          id: m.id,
          from: m.sender_user_id === session.user_id ? "me" : "them",
          body: m.body,
          time: new Date(m.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        }));
        setThreads((prev) => ({ ...prev, [id]: mapped }));
        if (data.signals?.[0]) {
          setChats((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    signalLabel: data.signals[0]?.label,
                    contextLine: data.signals[0]?.label,
                  }
                : c,
            ),
          );
        }
      } catch {
        /* keep empty */
      }
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeChatId) return;
    if (session) {
      try {
        const res = await sendMessage(activeChatId, body, session.access_token);
        const m = res.message;
        const msg: Message = {
          id: m.id,
          from: "me",
          body: m.body,
          time: "Now",
          signal: res.signals?.[0]
            ? { kind: "plan_forming", label: res.signals[0].label }
            : undefined,
        };
        setThreads((prev) => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] ?? []), msg],
        }));
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  preview: body,
                  time: "Now",
                  signalLabel: res.signals?.[0]?.label || c.signalLabel,
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

  if (activeChat) {
    return (
      <div className="app app-futura" aria-label={`Conversation with ${activeChat.name}`}>
        <div className="app-ambient" aria-hidden />
        <header className="chat-header glass">
          <button
            type="button"
            className="icon-btn"
            aria-label="Back to chats"
            onClick={() => setActiveChatId(null)}
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
          </div>
        </header>

        <div className="thread" role="log" aria-live="polite">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`bubble-row ${m.from === "me" ? "out" : "in"}`}
            >
              <div className={`bubble ${m.from === "me" ? "out" : "in"}`}>
                <p>{m.body}</p>
                <time>{m.time}</time>
              </div>
              {m.signal ? (
                <div className={`signal-chip signal-${m.signal.kind}`} role="status">
                  {m.signal.label}
                </div>
              ) : null}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          className="composer glass"
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

  if (!showFirstRun && !authenticated && authReady) {
    return (
      <div className="app app-futura" aria-label="Opal activation">
        <div className="app-ambient" aria-hidden />
        <header className="topbar glass">
          <OpalLockup size="md" />
        </header>
        <main className="pane">
          {!apiConfigured() ? (
            <div className="activation">
              <p className="activation-error" role="alert">
                Could not connect. The hosted Opal service is not configured for this build.
              </p>
            </div>
          ) : (
            <ActivationFlow
              onAuthenticated={(s) => {
                setSession(s);
                saveSession(s);
                void refreshLive(s);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app app-futura" aria-label="Opal">
      <div className="app-ambient" aria-hidden />
      <FirstRunExperience open={showFirstRun} onComplete={completeFirstRun} />

      <header className="topbar glass">
        <OpalLockup size="md" />
        {authenticated ? (
          <span className="session-pill" title="Authoritative session">
            Live
          </span>
        ) : null}
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
            authenticated={authenticated}
            loading={loadingLive}
          />
        ) : null}
        {tab === "chats" ? (
          <ChatsPane
            chats={chats}
            onOpen={(id) => void openChat(id)}
            authenticated={authenticated}
            loading={loadingLive}
          />
        ) : null}
        {tab === "plans" ? (
          <PlansPane authenticated={authenticated} signals={liveSignals} />
        ) : null}
        {tab === "you" ? (
          <YouPane
            onReplayIntro={() => setShowFirstRun(true)}
            session={session}
            onSignOut={async () => {
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
            }}
          />
        ) : null}
      </main>

      <nav className="tabbar glass" aria-label="Primary">
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
}: {
  needs: NeedItem[];
  onComplete: (id: string) => void;
  onOpenChat: (id?: string) => void;
  authenticated?: boolean;
  loading?: boolean;
}) {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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
        {PLANS.filter((p) => p.status !== "needs_you").map((p) => (
          <article key={p.id} className="card lumen-card">
            <h4>{p.title}</h4>
            <p>
              {p.when}
              <span className="dot">·</span>
              {p.who}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}

function ChatsPane({
  chats,
  onOpen,
  authenticated,
  loading,
}: {
  chats: ChatPreview[];
  onOpen: (id: string) => void;
  authenticated?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="scroll">
      <h2 className="screen-title">Chats</h2>
      {loading ? <p className="empty">Loading conversations…</p> : null}
      {!loading && chats.length === 0 ? (
        <p className="empty">
          {authenticated
            ? "No conversations yet. Invite someone from activation or You."
            : PRODUCT_COPY.emptyChats}
        </p>
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
                    <div className={`signal-chip row signal-${c.signal ?? "moment"}`}>
                      {c.signalLabel}
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
}: {
  authenticated?: boolean;
  signals?: ProductSignal[];
}) {
  const groups = [
    { key: "needs_you" as const, label: "Needs confirmation" },
    { key: "today" as const, label: "Today" },
    { key: "upcoming" as const, label: "Upcoming" },
  ];
  return (
    <div className="scroll">
      <h2 className="screen-title">Plans</h2>
      <p className="lede muted-lede">
        {authenticated
          ? "Plans stay possibilities until people act."
          : PRODUCT_COPY.emptyPlans}
      </p>
      {authenticated && signals && signals.length > 0 ? (
        <section className="section">
          <h3 className="section-label">Becoming a plan</h3>
          {signals.map((s, i) => (
            <article key={i} className="card lumen-card">
              <h4>{s.label}</h4>
              <p>{s.evidence_preview || "From a recent conversation"}</p>
            </article>
          ))}
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
                  <article key={p.id} className="card lumen-card">
                    <h4>{p.title}</h4>
                    <p>
                      {p.when}
                      <span className="dot">·</span>
                      {p.who}
                    </p>
                  </article>
                ))}
              </section>
            );
          })
        : null}
      {authenticated && (!signals || signals.length === 0) ? (
        <p className="empty">Nothing forming yet.</p>
      ) : null}
    </div>
  );
}

function YouPane({
  onReplayIntro,
  session,
  onSignOut,
}: {
  onReplayIntro: () => void;
  session: ProductSession | null;
  onSignOut: () => void | Promise<void>;
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
          <button type="button" className="settings-row" onClick={() => void onSignOut()}>
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
