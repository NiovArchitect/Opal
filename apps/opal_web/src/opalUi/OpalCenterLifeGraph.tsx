/**
 * Opal Center V2 — Life Graph / Solo-First (Figma 1094:161).
 * Authority: founder-approved 2026-09-10 (addendum). 1086:2 neural dashboard REJECTED.
 * Thesis: conversation on top of a living life graph. P4 one-answer. Accept → same graph.
 * Solo first. Customer language only (no internal "anchor" vocabulary).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { OpalWordmark } from "../brand/OpalLogo";
import {
  authorizeRelationshipAction,
  createCenterPlan,
  fetchCalendarToday,
  listOpalPlans,
  resolveDecision,
  type DecisionResolvePayload,
} from "../api/productClient";
import { getDeviceCoords } from "../device/deviceLocation";
import { acquireMedia, mediaKindFromMime } from "../mediaAcquisition";
import type { MediaAsset, MediaSource } from "../nativeHostBridge";
import {
  STRIP_TICK_MS,
  composeNowStrip,
  normalizeDayStripEvents,
  planEventsForToday,
  type DayStripEvent,
  type DayStripNode,
  type DayStripSource,
} from "./centerNowStrip";
import { OpalCenterChat } from "./OpalCenterChat";
import { humanErrorCopy } from "../sharedReality";
import { OpalLivingCharacter } from "./OpalLivingCharacter";
import {
  localPlanSurfaceId,
  type CreatedPlanSurface,
} from "./graphSurfaceInterop";
import { listenOnce, VOICE_UNAVAILABLE_COPY } from "./opalCenterVoice";

type Phase = "rest" | "conversation" | "accepted" | "week" | "family" | "chat";

type DayNode = DayStripNode;

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
  /** Manage permissions only — Context primary tap opens in-Center sheet, not YOU. */
  onOpenSettings?: () => void;
  onOpenGraphs?: () => void;
  /** When Center confirms a plan — bubble up for Graph surface (stay in Center). */
  onPlanCreated?: (plan: CreatedPlanSurface) => void;
  /** Product session bearer for Opal Center chat API. */
  bearer?: string;
  userId?: string | null;
  /**
   * Repair #5 — dock reselect: bump while Center is open to return to Center root.
   * Must never open Talk to Opal.
   */
  centerRootEpoch?: number;
};

/**
 * Internal claim provenance — kept for engine honesty / tests.
 * Never paint source tokens (fixture_shell, decision_intelligence, etc.) to consumers.
 * ARCHITECTURE_STAYS_BEHIND_THE_GLASS.
 */
type ClaimProvenance = {
  claim: string;
  source: "decision_intelligence" | "fixture_shell" | "user_input" | "unavailable";
  detail?: string;
};

/** Map unresolved / failure outcomes to calm consumer copy. */
function humanResolveNote(payload: DecisionResolvePayload | null, fallback?: string | null): string {
  const outcome = (payload?.outcome || "").toUpperCase();
  if (
    ["NO_VALID_CANDIDATE", "NOT_RESOLVED", "NOT_HIGH_CONFIDENCE", "FAILURE"].includes(outcome) ||
    !payload?.answer?.name
  ) {
    return (
      "I don't have enough live context to pick one confidently yet. Want me to look nearby or use a place you already like?"
    );
  }
  if (fallback && !/fixture|decision_intelligence|NOT_RESOLVED|unresolved|Area not asserted/i.test(fallback)) {
    return fallback;
  }
  return "Here are the best matches for this window.";
}

function todayLabel() {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
      .format(new Date())
      .toUpperCase();
  } catch {
    return "TODAY";
  }
}

const NUDGE_STORAGE = "opal.center.nudges.dismissed.v1";
/** Sample prompts only — not live AttentionCenter rows (Paste J honesty). */
const CENTER_SAMPLE_PROMPTS = [
  {
    id: "maya-birthday-3d",
    body: "Maya's birthday in 3 days - want me to plan something?",
    tone: "gold" as const,
  },
  {
    id: "open-friday-window",
    body: "Friday evening is still open - dinner with someone close?",
    tone: "cyan" as const,
  },
] as const;

function loadDismissedNudges(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NUDGE_STORAGE);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/** Affirmative seed from a sample nudge — tap = yes for birthday CTAs. */
function seedFromNudge(n: { id: string; body: string }): string {
  const body = n.body.trim();
  if (/birthday/i.test(body) && /want me to plan/i.test(body)) {
    // Tap is the affirmative; keep person/context, mark as plan something.
    return body.replace(/\?\s*$/, "") + " - yes, plan something.";
  }
  // Generic open window: WHO unresolved — send body as-is (BE clears stale who).
  return body;
}

export function OpalCenterLifeGraph({
  onClose,
  onSeedGraph,
  onOpenSettings,
  onOpenGraphs,
  onPlanCreated,
  bearer,
  userId,
  centerRootEpoch = 0,
}: Props) {
  const [phase, setPhase] = useState<Phase>("rest");
  const [query, setQuery] = useState("");
  /** Repair #4 — seed utterance handed to OpalCenterChat (one intelligence path). */
  const [chatSeed, setChatSeed] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(() => loadDismissedNudges());
  const visibleNudges = useMemo(
    () => CENTER_SAMPLE_PROMPTS.filter((n) => !dismissedNudges.has(n.id)).slice(0, 2),
    [dismissedNudges],
  );
  const dismissNudge = (id: string) => {
    setDismissedNudges((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem(NUDGE_STORAGE, JSON.stringify([...next]));
      } catch {
        /* private */
      }
      return next;
    });
  };
  // Repair #17 W5 — the strip paints ONLY live data: linked-calendar
  // events, else the user's real plans for today, else an honest empty
  // state. The old sample-day fallback (3:30 Appointment / 7:30 Dinner
  // fixtures) is gone from the render path.
  const initialStrip = useMemo(
    () =>
      composeNowStrip({
        nowMs: Date.now(),
        events: [],
        source: "none",
      }),
    [],
  );
  const [dayNodes, setDayNodes] = useState<DayNode[]>(() => initialStrip.nodes);
  const [stripSource, setStripSource] = useState<DayStripSource>(initialStrip.source);
  const [stripAttribution, setStripAttribution] = useState(initialStrip.attribution);
  const [acceptedTitle, setAcceptedTitle] = useState("Juniper & Ivy");
  // F12-12: week chips are the real current 7-day window, not hardcoded Thu-Sun.
  const weekDays = useMemo(() => {
    const days: { key: string; short: string; full: string; date: Date }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const short = d.toLocaleDateString("en-US", { weekday: "short" });
      const full = d.toLocaleDateString("en-US", { weekday: "long" });
      days.push({ key: d.toISOString().slice(0, 10), short, full, date: d });
    }
    return days;
  }, []);
  const [weekDay, setWeekDay] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  });
  const [resolving, setResolving] = useState(false);
  const [decision, setDecision] = useState<DecisionResolvePayload | null>(null);
  const [speakQueue, setSpeakQueue] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<ClaimProvenance[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachNote, setAttachNote] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{
    source: MediaSource;
    asset: MediaAsset;
    kind: "photo" | "video" | "document";
  } | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const dateLine = useMemo(() => `TODAY · ${todayLabel()}`, []);
  const hasText = query.trim().length > 0;

  /** Stale-async guard: ignore resolve results from superseded requests. */
  const requestGen = useRef(0);
  /** Idempotency: double-tap "Go with this" must not seed two Graphs. */
  const acceptLock = useRef(false);
  const lastIdempotencyKey = useRef<string | null>(null);
  /** Live strip data: linked-calendar events, else today's real plans. */
  const stripDataRef = useRef<{ events: DayStripEvent[]; source: DayStripSource }>({
    events: [],
    source: "none",
  });
  /** Pause live recompute after accept overwrites the strip. */
  const stripLiveRef = useRef(true);

  function applyLiveStrip(nowMs = Date.now()) {
    if (!stripLiveRef.current) return;
    const { events, source } = stripDataRef.current;
    const result = composeNowStrip({
      nowMs,
      events,
      source,
    });
    setDayNodes(result.nodes);
    setStripSource(result.source);
    setStripAttribution(result.attribution);
  }

  async function loadStripData() {
    if (!bearer) {
      stripDataRef.current = { events: [], source: "none" };
      applyLiveStrip();
      return;
    }
    // 1) Linked calendar, when connected — the richest real source.
    try {
      const res = await fetchCalendarToday(bearer);
      if (res.connected) {
        stripDataRef.current = {
          events: normalizeDayStripEvents(res.events || []),
          source: "calendar",
        };
        applyLiveStrip();
        return;
      }
    } catch {
      /* Calendar read failed — fall through to the user's real plans. */
    }
    // 2) The user's real plans for today (live plans endpoint).
    try {
      const res = await listOpalPlans(bearer);
      const events = planEventsForToday(res.plans || [], new Date());
      stripDataRef.current = {
        events,
        source: events.length ? "plans" : "none",
      };
    } catch {
      stripDataRef.current = { events: [], source: "none" };
    }
    applyLiveStrip();
  }

  useEffect(() => {
    if (phase !== "rest") return;
    stripLiveRef.current = true;
    void loadStripData();
    const id = window.setInterval(() => applyLiveStrip(), STRIP_TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, bearer]);

  async function attachFromNative(source: MediaSource) {
    if (attachBusy) return;
    setAttachBusy(true);
    setAttachOpen(false);
    setAttachNote(null);
    try {
      const result = await acquireMedia({
        source,
        initiating_surface: "center",
        media_types: source === "document" ? ["image"] : ["image", "video"],
        accept:
          source === "document"
            ? ".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
            : "image/*,video/*",
        accepted_mime_types:
          source === "document"
            ? [
                "application/pdf",
                "text/plain",
                "text/markdown",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".pdf",
                ".txt",
                ".md",
                ".doc",
                ".docx",
              ]
            : undefined,
      });
      if (result.status === "cancelled") {
        setAttachNote(
          source === "document" ? "Document picker cancelled." : "Media cancelled.",
        );
        return;
      }
      if (result.status === "error") {
        setAttachNote(result.message);
        return;
      }
      const kind = mediaKindFromMime(result.asset.mime_type);
      setAttachment({ source, asset: result.asset, kind });
      const label =
        result.asset.filename ||
        (kind === "document" ? "Document" : kind === "video" ? "Video" : "Photo");
      // Honest gate: preview is local until upload/ingest ships.
      setAttachNote(
        `I can see ${label} here. I can't read it into the conversation yet.`,
      );
    } finally {
      setAttachBusy(false);
    }
  }

  /**
   * Repair #4 P0 — one Opal intelligence path.
   * Rest composer, chips, nudges, and mic enter Talk-to-Opal orchestration
   * (OpalConversations → Intent → Response → DeepSeek when ready).
   * Decision Intelligence nearby_now is no longer the free-text brain.
   *
   * Repair #18 — a rest entry is a SEED FOR A NEW CHAT, never an
   * auto-send into whichever chat is active: OpalCenterChat receives
   * it with seedAsDraft + initialChatIntent="new", creates a fresh
   * chat, and leaves the seed sitting in that chat's composer. The
   * user presses Send. The previous chat is untouched.
   */
  function openChatWith(text?: string) {
    const q = (text ?? query).trim();
    if (!q) return;
    setQuery(q);
    setChatSeed(q);
    setAttachNote(null);
    setPhase("chat");
  }

  // Repair #5 — dock reselect returns to Center root; never opens Talk to Opal.
  useEffect(() => {
    if (!centerRootEpoch) return;
    setPhase("rest");
    setChatSeed(null);
    setQuery("");
    setAttachNote(null);
  }, [centerRootEpoch]);

  /** Kept for conversation-phase DI card adjustments only (Timing/Budget/Vibe). */
  async function askAboutDay(text?: string) {
    const q = (text ?? query).trim() || "I've got two hours. What fits me nearby?";
    setQuery(q);
    setPhase("conversation");
    setResolving(true);
    setDecision(null);
    setResolveNote(null);
    acceptLock.current = false;

    const gen = ++requestGen.current;
    const idempotencyKey = `center-v2-${Date.now()}-${gen}-${q.slice(0, 48)}`;
    lastIdempotencyKey.current = idempotencyKey;

    try {
      // W8 Phase 4 — pass real device coords when available (Meet Allow caches them).
      const coords = await getDeviceCoords();
      const payload = await resolveDecision({
        intent: "nearby_now",
        scope_type: "solo",
        preference_context: { free_text: q, center_v2: true },
        time_context: { open_window_hours: 2 },
        idempotency_key: idempotencyKey,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      if (gen !== requestGen.current) {
        /* Stale asynchronous intelligence — newer intent superseded this result. */
        return;
      }
      setDecision(payload);
      const name = payload.answer?.name || null;
      if (name) {
        setSpeakQueue(`${name} fits this window.`);
      }
      // Internal provenance only — never rendered as consumer copy.
      const claims: ClaimProvenance[] = [
        {
          claim: name ? `${name} fits this window` : "One answer pending",
          source: payload.real ? "decision_intelligence" : "fixture_shell",
          detail: payload.candidate_source || payload.outcome || undefined,
        },
        {
          claim: payload.answer?.area ? `Area: ${payload.answer.area}` : "Area not asserted",
          source: payload.answer?.area ? "decision_intelligence" : "unavailable",
        },
        {
          claim: payload.provisional ? "Provisional - confirm before commit" : "Resolved",
          source: "decision_intelligence",
          detail: payload.confidence_class || payload.mode,
        },
      ];
      setProvenance(claims);
      if (!name) {
        setResolveNote(humanResolveNote(payload, payload.note));
      } else {
        setResolveNote(null);
      }
    } catch (err) {
      if (gen !== requestGen.current) return;
      setDecision(null);
      setResolveNote(
        "I don't have enough live context to pick one confidently yet. Want me to look nearby or use a place you already like?",
      );
      setProvenance([
        {
          claim: "No provider answer shown",
          source: "unavailable",
          detail: err instanceof Error ? err.message : "resolveDecision failed",
        },
      ]);
    } finally {
      if (gen === requestGen.current) setResolving(false);
    }
  }

  async function acceptAnswer() {
    if (acceptLock.current) return; /* idempotent accept */
    acceptLock.current = true;
    const title =
      decision?.answer?.name?.trim() ||
      acceptedTitle ||
      "Chosen fit";
    const area = decision?.answer?.area?.trim() || undefined;
    setAcceptedTitle(title);
    const timeLabel = "Open";
    stripLiveRef.current = false;
    // Repair #17 W5 — no fabricated "Next event" node after accept: the
    // strip shows Now plus the plan the user just accepted, nothing else.
    setDayNodes([
      { id: "now", time: "Now", label: timeLabel, kind: "now" },
      { id: "fit", time: "Next", label: title, kind: "accepted" },
    ]);
    setPhase("accepted");
    onSeedGraph?.(title);

    let surface: CreatedPlanSurface = {
      id: localPlanSurfaceId("solo", title),
      title,
      who: "Just you",
      when: "Open window",
      what: title,
      place: area || title,
      sharedPlanId: null,
      createdAt: new Date().toISOString(),
    };

    if (bearer) {
      try {
        // Action ceiling: solo prepare allowed by default; execute never implied.
        const authz = await authorizeRelationshipAction(
          {
            data_category: "plans_commitments",
            action_ceiling: "prepare",
            disclose: false,
          },
          bearer,
        );
        if (!authz.allowed) {
          setResolveNote(
            "Saved on your day view. Durable plan needs a higher planning permission in YOU.",
          );
        } else {
          const res = await createCenterPlan(
            {
              title,
              location: area || title,
              area,
              time_label: "Open window",
              decision_id: decision?.decision_id || undefined,
            },
            bearer,
          );
          const planId = res.plan?.id;
          if (planId) {
            surface = {
              ...surface,
              id: planId,
              sharedPlanId: planId,
              place: res.plan.location || surface.place,
            };
            setResolveNote(res.message || "It's on your day.");
          }
        }
      } catch (err) {
        // F12-44: human copy, never err.message verbatim.
        setResolveNote(
          humanErrorCopy(err, "Couldn't save that - check your connection and try again."),
        );
      }
    } else {
      setResolveNote(
        "Saved on your day view. Sign in to lock a durable plan.",
      );
    }
    onPlanCreated?.(surface);
  }

  async function onLifeGraphMic() {
    if (listening) {
      setListening(false);
      setAttachNote(null);
      return;
    }
    setListening(true);
    setAttachNote("Voice input is on…");
    try {
      const result = await listenOnce();
      setListening(false);
      if (result.status === "ok" && result.text.trim()) {
        setQuery(result.text.trim());
        setAttachNote(null);
        return;
      }
      if (result.status === "denied") {
        setAttachNote("Microphone access is blocked. Enable it in Settings to talk to Opal.");
        return;
      }
      if (result.status === "offline") {
        setAttachNote("Voice needs internet");
        return;
      }
      if (result.status === "unavailable") {
        setAttachNote(result.message || VOICE_UNAVAILABLE_COPY);
        return;
      }
      setAttachNote("I didn't catch that. Try again or type instead.");
    } catch {
      setListening(false);
      setAttachNote(VOICE_UNAVAILABLE_COPY);
    }
  }

  function composerPlaceholder() {
    if (phase === "conversation") return "Ask a follow-up…";
    if (phase === "accepted") return "Change it, move it, invite someone…";
    if (phase === "week") return "Ask about another day…";
    if (phase === "family") return "Adjust the shared day…";
    return "Ask Opal about your day";
  }

  return (
    <div
      className="opal-center-v2"
      data-testid="opal-center-life-graph"
      data-figma-authority="1094:161"
      data-center-phase={phase}
      data-participant-mode="solo"
      data-brand-v4="true"
    >
      <div className="opal-center-v2-bloom" aria-hidden />

      {phase === "chat" ? (
        <OpalCenterChat
          onBack={() => {
            setPhase("rest");
            setChatSeed(null);
            setQuery("");
          }}
          onPlanCreated={onPlanCreated}
          bearer={bearer}
          userId={userId}
          initialMessage={chatSeed}
          seedAsDraft
          initialChatIntent="new"
        />
      ) : (
        <>
      <header className="opal-center-v2-top" data-testid="opal-center-presence-header">
        <OpalWordmark height={34} className="opal-center-v2-wordmark opal-center-v2-wordmark-aside" data-testid="opal-center-lifegraph-wordmark" />
        <div className="opal-center-v2-presence">
          <OpalLivingCharacter
            size={56}
            testId="opal-center-presence"
            requestInFlight={resolving}
            externalListening={listening}
            speakQueue={speakQueue}
            onSpeakDone={() => setSpeakQueue(null)}
            onTranscript={(text) => {
              setQuery(text);
              setAttachNote(null);
              // One intelligence path — live utterance enters OC chat orchestration.
              openChatWith(text);
            }}
          />
        </div>
        <button
          type="button"
          className="opal-center-v2-refresh"
          aria-label="Refresh day"
          data-testid="opal-center-refresh"
          onClick={() => {
            setPhase("rest");
            setQuery("");
            stripLiveRef.current = true;
            void loadStripData();
          }}
        >
          ↻
        </button>
      </header>

      {/* One scroll owner for body copy. Mode tabs + composer are in-flow chrome below. */}
      <div className="opal-center-v2-scroll" data-testid="opal-center-scroll">
      {phase === "rest" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-rest">
          <p className="opal-center-v2-kicker">{dateLine}</p>
          <h1 className="opal-center-v2-title">Your day has room.</h1>
          <p
            className="opal-center-v2-lede"
            data-testid="opal-center-rest-lede"
            data-strip-source={stripSource}
          >
            {stripSource === "calendar"
              ? dayNodes.some((n) => n.kind === "now" && n.label === "Open")
                ? "Right now looks open - ask and I'll shape one answer."
                : "Here's what's next on your linked calendar."
              : stripSource === "plans"
                ? "Here's what's next from your plans."
                : "Nothing on your day yet - ask and I'll shape one answer."}
          </p>

          <LifeGraphStrip nodes={dayNodes} source={stripSource} />
          <p
            className="opal-center-v2-footnote"
            data-testid="opal-center-day-shell-note"
            data-strip-source={stripSource}
            data-sample-day={stripSource === "sample" ? "true" : "false"}
          >
            {stripAttribution}
          </p>

          <div className="opal-center-v2-signal">
            <span className="opal-gradient-dot" aria-hidden data-testid="opal-gradient-dot" />
            <div>
              <p className="opal-center-v2-signal-primary">
                Ask about an open window and I&apos;ll shape one answer.
              </p>
              <p className="opal-center-v2-signal-secondary">
                Live free-time math connects when your calendar is linked.
              </p>
            </div>
          </div>

          {visibleNudges.length ? (
            <div className="opal-center-nudges" data-testid="opal-center-nudges">
              <p className="opal-center-v2-footnote" data-testid="opal-center-sample-prompts-note">
                Ideas to try. Live reminders connect as Opal learns your people.
              </p>
              {visibleNudges.map((n) => (
                <div
                  key={n.id}
                  className={`opal-center-nudge is-${n.tone}`}
                  data-testid={`opal-center-nudge-${n.id}`}
                  data-sample-prompt="true"
                >
                  <p
                    className="opal-center-nudge-body"
                    role="button"
                    tabIndex={0}
                    onClick={() => openChatWith(seedFromNudge(n))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openChatWith(seedFromNudge(n));
                      }
                    }}
                  >
                    {n.body}
                  </p>
                  <button
                    type="button"
                    className="opal-center-nudge-dismiss"
                    aria-label="Dismiss"
                    data-testid={`opal-center-nudge-dismiss-${n.id}`}
                    onClick={() => dismissNudge(n.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className="opal-center-v2-primary opal-center-talk-to-opal"
            data-testid="opal-center-talk-to-opal"
            onClick={() => {
              setChatSeed(null);
              setPhase("chat");
            }}
          >
            Talk to Opal
          </button>

          <div className="opal-center-v2-quick" role="group" aria-label="Quick actions">
            <button
              type="button"
              className="opal-center-v2-chip"
              data-testid="opal-center-chip-nearby"
              onClick={() => openChatWith("What's nearby in an open window?")}
            >
              Nearby now
            </button>
            <button
              type="button"
              className="opal-center-v2-chip"
              data-testid="opal-center-chip-whats-next"
              onClick={() => openChatWith("What's next?")}
            >
              What&apos;s next?
            </button>
            <button
              type="button"
              className="opal-center-v2-chip"
              data-testid="opal-center-chip-tonight"
              onClick={() => openChatWith("Ideas for tonight nearby")}
            >
              Tonight ideas
            </button>
          </div>

          <p className="opal-center-v2-footnote">
            Your graph shows only what matters. Ask naturally or tap a moment.
          </p>
        </section>
      ) : null}

      {phase === "conversation" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-conversation">
          <div className="opal-center-v2-context-pill">
            <span>Just you · Nearby · open window · permitted context</span>
            <button
              type="button"
              className="opal-center-v2-context-link"
              data-testid="opal-center-context"
              onClick={() => setContextSheetOpen(true)}
            >
              Context
            </button>
          </div>

          <div className="opal-center-v2-user-bubble">
            {query.trim() || "I've got two hours. What fits me nearby?"}
          </div>

          <div className="opal-center-v2-signal">
            <span className="opal-gradient-dot" aria-hidden data-testid="opal-gradient-dot" />
            <div>
              <p className="opal-center-v2-signal-primary">
                {resolving
                  ? "Looking nearby…"
                  : decision?.answer?.name
                    ? `${decision.answer.name} fits this window.`
                    : "One answer first - then you confirm."}
              </p>
              <p className="opal-center-v2-signal-secondary">
                {decision?.provisional
                  ? "Confirm before anything is booked."
                  : resolveNote || "I'll pick the best fit when I have enough context."}
              </p>
            </div>
          </div>

          {decision?.answer?.name ? (
            <article
              className="opal-center-v2-answer"
              data-testid="opal-center-one-answer"
              data-decision-id={decision.decision_id}
              data-real={decision.real ? "true" : "false"}
              data-provisional={decision.provisional ? "true" : "false"}
              data-idempotency-key={lastIdempotencyKey.current || undefined}
            >
              <p className="opal-center-v2-answer-kicker">BEST FIT RIGHT NOW</p>
              <h2 className="opal-center-v2-answer-title">{decision.answer.name}</h2>
              {decision.answer.area ? (
                <p className="opal-center-v2-answer-meta">{decision.answer.area}</p>
              ) : null}
              <div className="opal-center-v2-answer-actions">
                <button
                  type="button"
                  className="opal-center-v2-primary"
                  data-testid="opal-center-go-with-this"
                  onClick={() => void acceptAnswer()}
                >
                  Go with this
                </button>
                <button
                  type="button"
                  className="opal-center-v2-secondary"
                  onClick={() => {
                    requestGen.current += 1;
                    setPhase("rest");
                    setDecision(null);
                  }}
                >
                  Adjust
                </button>
              </div>
            </article>
          ) : null}

          {!resolving && !decision?.answer?.name && resolveNote ? (
            <p className="opal-center-v2-footnote" role="status" data-testid="opal-center-resolve-note">
              {resolveNote}
            </p>
          ) : null}

          {decision?.answer?.name ? (
            <>
              <div className="opal-center-v2-controls" role="group" aria-label="Answer controls">
                <button
                  type="button"
                  className="opal-center-v2-chip"
                  onClick={() => void askAboutDay(`Adjust timing for ${decision.answer?.name}`)}
                >
                  Timing
                </button>
                <button
                  type="button"
                  className="opal-center-v2-chip"
                  onClick={() => void askAboutDay(`Adjust budget for ${decision.answer?.name}`)}
                >
                  Budget
                </button>
                <button
                  type="button"
                  className="opal-center-v2-chip"
                  onClick={() => void askAboutDay(`Adjust vibe for ${decision.answer?.name}`)}
                >
                  Vibe
                </button>
                <button
                  type="button"
                  className="opal-center-v2-chip"
                  onClick={() => void askAboutDay("More ideas nearby in this window")}
                >
                  More ideas
                </button>
              </div>
              <p className="opal-center-v2-footnote">These controls appear only because an answer exists.</p>
            </>
          ) : null}

          {/* F12-09: provenance is internal-only. It renders ONLY in the test env
              (source guards assert its shape); production never mounts it —
              not even behind `hidden` (one CSS rule away from a leak). */}
          {typeof process !== "undefined" &&
          process.env?.NODE_ENV === "test" &&
          provenance.length ? (
            <ul
              className="opal-center-v2-provenance"
              data-testid="opal-center-provenance"
              data-consumer-visible="0"
              aria-hidden="true"
              hidden
            >
              {provenance.map((p) => (
                <li key={p.claim} data-source={p.source}>
                  {p.claim}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {phase === "accepted" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-accepted">
          <p className="opal-center-v2-kicker">TODAY · UPDATED</p>
          <h1 className="opal-center-v2-title">It&apos;s on your day.</h1>
          <p className="opal-center-v2-lede">
            {resolveNote || "One decision is locked as a tentative plan. Invite when you're ready."}
          </p>

          <LifeGraphStrip nodes={dayNodes} source={stripSource} />

          <div className="opal-center-v2-signal">
            <span className="opal-gradient-dot" aria-hidden data-testid="opal-gradient-dot" />
            <div>
              <p className="opal-center-v2-signal-primary">It&apos;s in your day.</p>
              <p className="opal-center-v2-signal-secondary">
                Open Graph to see it, or Talk to Opal to invite someone.
              </p>
            </div>
          </div>

          <article className="opal-center-v2-material" data-testid="opal-center-material-time">
            <p className="opal-center-v2-answer-kicker">LEAVE TIME</p>
            <p className="opal-center-v2-material-line">Leave time when location is available</p>
            <p className="opal-center-v2-answer-meta">
              No fabricated traffic or countdown until location is permitted.
            </p>
          </article>

          <div className="opal-center-v2-answer-actions">
            <button
              type="button"
              className="opal-center-v2-primary"
              onClick={() => {
                onSeedGraph?.(acceptedTitle);
                onOpenGraphs?.();
              }}
            >
              Open Graph
            </button>
            <button type="button" className="opal-center-v2-secondary" onClick={() => setPhase("conversation")}>
              Change it
            </button>
          </div>
        </section>
      ) : null}

      {phase === "week" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-week">
          <p className="opal-center-v2-kicker">THIS WEEK</p>
          <h1 className="opal-center-v2-title">See the shape, not the grid.</h1>
          <p className="opal-center-v2-lede">Only meaningful events and openings.</p>

          <div className="opal-center-v2-week-days" role="tablist" aria-label="Week days">
            {weekDays.map((d) => (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={weekDay === d.key}
                aria-label={d.full}
                className={`opal-center-v2-chip ${weekDay === d.key ? "is-active" : ""}`}
                onClick={() => setWeekDay(d.key)}
              >
                {d.short}
              </button>
            ))}
          </div>

          <h2 className="opal-center-v2-day-name">
            {weekDays.find((d) => d.key === weekDay)?.full || "Today"}
          </h2>
          <p className="opal-center-v2-lede">
            Openings load from your live week when available.
          </p>

          <p className="opal-center-v2-footnote" data-testid="opal-center-week-empty" role="status">
            No live openings painted for{" "}
            {weekDays.find((d) => d.key === weekDay)?.full || "this day"} yet. Ask Opal or link
            your calendar.
          </p>

          <div className="opal-center-v2-signal">
            <span className="opal-gradient-dot" aria-hidden data-testid="opal-gradient-dot" />
            <div>
              <p className="opal-center-v2-signal-primary">Want me to shape the open window?</p>
              <button
                type="button"
                className="opal-center-v2-primary"
                onClick={() =>
                  openChatWith(
                    `Shape ${weekDays.find((d) => d.key === weekDay)?.full || "today"} open window`,
                  )
                }
              >
                Yes, curate it
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {phase === "family" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-family">
          <p className="opal-center-v2-kicker">SHARED</p>
          <h1 className="opal-center-v2-title">Shared plans</h1>
          <p className="opal-center-v2-lede">
            Same graph. Shared result. Private constraints stay private.
          </p>

          <p className="opal-center-v2-footnote" data-testid="opal-center-family-empty" role="status">
            No shared plans yet. Live family plans appear here when people are invited.
          </p>
          <button type="button" className="opal-center-v2-chip" onClick={() => setPhase("rest")}>
            Back to today
          </button>
        </section>
      ) : null}
      </div>

      <div className="opal-center-v2-lenses" role="group" aria-label="Life graph lenses">
        <button
          type="button"
          className={`opal-center-v2-lens ${phase === "rest" || phase === "conversation" || phase === "accepted" ? "is-active" : ""}`}
          onClick={() => setPhase("rest")}
        >
          Today
        </button>
        <button
          type="button"
          className={`opal-center-v2-lens ${phase === "week" ? "is-active" : ""}`}
          onClick={() => setPhase("week")}
        >
          Week
        </button>
        <button
          type="button"
          className={`opal-center-v2-lens ${phase === "family" ? "is-active" : ""}`}
          onClick={() => setPhase("family")}
        >
          Shared
        </button>
      </div>

      {attachOpen ? (
        <div
          className="opal-center-attach-menu"
          data-testid="opal-center-attach-menu"
          role="menu"
          aria-label="Add context for Opal"
        >
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-attach-library"
            disabled={attachBusy}
            onClick={() => void attachFromNative("photo_library")}
          >
            Photo library
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-attach-camera"
            disabled={attachBusy}
            onClick={() => void attachFromNative("camera")}
          >
            Take photo or video
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-attach-file"
            disabled={attachBusy}
            onClick={() => void attachFromNative("document")}
          >
            Document
          </button>
          <button
            type="button"
            role="menuitem"
            className="is-muted"
            onClick={() => setAttachOpen(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {attachment ? (
        <div
          className="opal-center-attach-preview"
          data-testid="opal-center-attach-preview"
          data-attach-kind={attachment.kind}
          data-attach-source={attachment.source}
        >
          {attachment.kind === "photo" || attachment.kind === "video" ? (
            <img
              src={attachment.asset.preview_url}
              alt=""
              className="opal-center-attach-thumb"
            />
          ) : (
            <span className="opal-center-attach-doc-label">
              {attachment.asset.filename || "Document"}
            </span>
          )}
          <button
            type="button"
            className="opal-center-v2-chip"
            data-testid="opal-center-attach-remove"
            onClick={() => {
              setAttachment(null);
              setAttachNote(null);
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      {attachNote ? (
        <p
          className="opal-center-v2-footnote opal-center-attach-note"
          role="status"
          data-testid="opal-center-attach-note"
        >
          {attachNote}
        </p>
      ) : null}

      {phase === "rest" ? (
        <div
          className="opal-center-destination-pill"
          data-testid="center-destination-pill"
          role="status"
        >
          New chat
        </div>
      ) : null}

      <div className="opal-composer opal-center-v2-composer" data-figma-node="1094:146">
        <button
          type="button"
          className="opal-attach"
          aria-label="Add context"
          aria-expanded={attachOpen}
          data-testid="opal-center-attach"
          onClick={() => setAttachOpen((v) => !v)}
        >
          +
        </button>
        <label className="sr-only" htmlFor="opal-center-query">
          Message or talk to Opal
        </label>
        <input
          id="opal-center-query"
          className="opal-query"
          data-testid="opal-center-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={composerPlaceholder()}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter" && hasText) openChatWith();
          }}
        />
        {hasText ? (
          <button
            type="button"
            className="opal-center-send"
            data-testid="opal-center-send"
            aria-label="Send"
            onClick={() => openChatWith()}
          >
            <span className="opal-center-send-glyph" aria-hidden>
              ↑
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={`opal-center-mic ${listening ? "is-listening" : ""}`}
            data-testid="opal-center-voice"
            aria-label={listening ? "Stop voice input" : "Speak to Opal"}
            aria-pressed={listening}
            onClick={() => void onLifeGraphMic()}
          >
            <svg
              className="opal-center-mic-glyph"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"
              />
            </svg>
          </button>
        )}
      </div>
        </>
      )}

      {contextSheetOpen ? (
        <div
          className="opal-inline-sheet opal-center-context-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="opal-center-context-title"
          data-testid="opal-center-context-sheet"
        >
          <div className="opal-inline-sheet-card">
            <header className="opal-inline-sheet-top">
              <h2 id="opal-center-context-title">Context</h2>
              <button
                type="button"
                data-testid="opal-center-context-close"
                onClick={() => setContextSheetOpen(false)}
                aria-label="Close"
              >
                Close
              </button>
            </header>
            <p className="opal-inline-sheet-body">
              Why this suggestion - people, places, and vibe in play right now.
              {"\n\n"}
              Privacy boundaries stay on: Opal only uses what you allow for this moment.
            </p>
            {onOpenSettings ? (
              <button
                type="button"
                className="opal-inline-sheet-action"
                data-testid="opal-center-context-manage"
                onClick={() => {
                  setContextSheetOpen(false);
                  onOpenSettings();
                }}
              >
                Manage permissions
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {onClose ? (
        <button type="button" className="opal-center-v2-close sr-only" onClick={onClose}>
          Close Opal chat center
        </button>
      ) : null}
    </div>
  );
}

function LifeGraphStrip({
  nodes,
  source,
}: {
  nodes: DayNode[];
  source: DayStripSource;
}) {
  return (
    <div
      className="opal-life-graph"
      data-testid="opal-life-graph-strip"
      data-strip-source={source}
      data-sample-day={source === "sample" ? "true" : "false"}
      aria-label={source === "sample" ? "Sample day life graph" : "Today life graph"}
    >
      <div className="opal-life-graph-line" aria-hidden />
      <div className="opal-life-graph-nodes">
        {nodes.map((n) => (
          <div key={n.id} className={`opal-life-graph-node is-${n.kind}`}>
            <span className="opal-life-graph-dot" aria-hidden />
            <span className="opal-life-graph-time">{n.time}</span>
            <span className="opal-life-graph-label">{n.label}</span>
            {n.detail ? (
              <span
                className="opal-life-graph-detail"
                data-testid="now-node-detail"
              >
                {n.detail}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
