/**
 * Opal Center V2 — Life Graph / Solo-First (Figma 1094:161).
 * Authority: founder-approved 2026-09-10 (addendum). 1086:2 neural dashboard REJECTED.
 * Thesis: conversation on top of a living life graph. P4 one-answer. Accept → same graph.
 * Solo first. Customer language only (no internal "anchor" vocabulary).
 */
import React, { useMemo, useRef, useState } from "react";
import { OpalWordmark } from "../brand/OpalLogo";
import { BRAND_ASSETS } from "../brand/brand";
import {
  resolveDecision,
  type DecisionResolvePayload,
} from "../api/productClient";

type Phase = "rest" | "conversation" | "accepted" | "week" | "family";

type DayNode = {
  id: string;
  time: string;
  label: string;
  kind: "now" | "open" | "event" | "accepted";
};

type Props = {
  onClose?: () => void;
  onSeedGraph?: (hint: string) => void;
  onOpenSettings?: () => void;
  onOpenGraphs?: () => void;
};

/** Provenance: every customer-facing claim should point at a real source when available. */
type ClaimProvenance = {
  claim: string;
  source: "decision_intelligence" | "fixture_shell" | "user_input" | "unavailable";
  detail?: string;
};

const REST_NODES: DayNode[] = [
  { id: "now", time: "Now", label: "Open", kind: "now" },
  { id: "mid", time: "3:30", label: "Appointment", kind: "event" },
  { id: "eve", time: "7:30", label: "Dinner", kind: "event" },
];

const WEEK_FRIDAY = [
  { time: "8:00", label: "Work" },
  { time: "5:30", label: "Open window" },
  { time: "9:00", label: "Evening plan" },
];

const FAMILY_SAT = [
  { time: "10:00", label: "Breakfast" },
  { time: "1:00", label: "Museum" },
  { time: "5:30", label: "Tacos + sunset" },
];

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

export function OpalCenterLifeGraph({
  onClose,
  onSeedGraph,
  onOpenSettings,
  onOpenGraphs,
}: Props) {
  const [phase, setPhase] = useState<Phase>("rest");
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [dayNodes, setDayNodes] = useState<DayNode[]>(REST_NODES);
  const [acceptedTitle, setAcceptedTitle] = useState("Juniper & Ivy");
  const [weekDay, setWeekDay] = useState<"Thu" | "Fri" | "Sat" | "Sun">("Fri");
  const [resolving, setResolving] = useState(false);
  const [decision, setDecision] = useState<DecisionResolvePayload | null>(null);
  const [resolveNote, setResolveNote] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<ClaimProvenance[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachNote, setAttachNote] = useState<string | null>(null);
  const dateLine = useMemo(() => `TODAY · ${todayLabel()}`, []);
  const hasText = query.trim().length > 0;

  /** Stale-async guard: ignore resolve results from superseded requests. */
  const requestGen = useRef(0);
  /** Idempotency: double-tap "Go with this" must not seed two Graphs. */
  const attachImageRef = useRef<HTMLInputElement | null>(null);
  const attachCameraRef = useRef<HTMLInputElement | null>(null);
  const attachFileRef = useRef<HTMLInputElement | null>(null);
  const acceptLock = useRef(false);
  const lastIdempotencyKey = useRef<string | null>(null);

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
      const payload = await resolveDecision({
        intent: "nearby_now",
        scope_type: "solo",
        preference_context: { free_text: q, center_v2: true },
        time_context: { open_window_hours: 2 },
        idempotency_key: idempotencyKey,
      });
      if (gen !== requestGen.current) {
        /* Stale asynchronous intelligence — newer intent superseded this result. */
        return;
      }
      setDecision(payload);
      const name = payload.answer?.name || null;
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
          claim: payload.provisional ? "Provisional — confirm before commit" : "Resolved",
          source: "decision_intelligence",
          detail: payload.confidence_class || payload.mode,
        },
      ];
      setProvenance(claims);
      if (!name) {
        setResolveNote(
          payload.note ||
            "Opal needs a clearer window or location permission before one high-confidence answer.",
        );
      }
    } catch (err) {
      if (gen !== requestGen.current) return;
      setDecision(null);
      setResolveNote(
        err instanceof Error
          ? err.message
          : "Decision Intelligence unavailable — not fabricating a place.",
      );
      setProvenance([
        {
          claim: "No provider answer shown",
          source: "unavailable",
          detail: "resolveDecision failed; UI does not invent distance/budget/traffic",
        },
      ]);
    } finally {
      if (gen === requestGen.current) setResolving(false);
    }
  }

  function acceptAnswer() {
    if (acceptLock.current) return; /* idempotent accept */
    acceptLock.current = true;
    const title =
      decision?.answer?.name?.trim() ||
      acceptedTitle ||
      "Chosen fit";
    setAcceptedTitle(title);
    const timeLabel = "Open";
    setDayNodes([
      { id: "now", time: "Now", label: timeLabel, kind: "now" },
      { id: "fit", time: "Next", label: title, kind: "accepted" },
      { id: "eve", time: "Later", label: "Next event", kind: "event" },
    ]);
    setPhase("accepted");
    onSeedGraph?.(title);
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

      <header className="opal-center-v2-top">
        <OpalWordmark className="opal-center-v2-wordmark" />
        <button
          type="button"
          className="opal-center-v2-refresh"
          aria-label="Refresh day"
          data-testid="opal-center-refresh"
          onClick={() => {
            setPhase("rest");
            setDayNodes(REST_NODES);
            setQuery("");
          }}
        >
          ↻
        </button>
      </header>

      {phase === "rest" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-rest">
          <p className="opal-center-v2-kicker">{dateLine}</p>
          <h1 className="opal-center-v2-title">Your day has room.</h1>
          <p className="opal-center-v2-lede">Two open windows before tonight.</p>

          <LifeGraphStrip nodes={dayNodes} />

          <div className="opal-center-v2-signal">
            <img
              className="opal-center-v2-signal-orb"
              src={BRAND_ASSETS.opalCenterOpalRest645}
              alt=""
              width={32}
              height={24}
            />
            <div>
              <p className="opal-center-v2-signal-primary">
                You have 2h 10m open before your next event.
              </p>
              <p className="opal-center-v2-signal-secondary">
                I can shape it around where you are, what you enjoy, and what you want to spend.
              </p>
            </div>
          </div>

          <div className="opal-center-v2-quick" role="group" aria-label="Quick actions">
            <button type="button" className="opal-center-v2-chip" onClick={() => askAboutDay("Curate my time")}>
              Curate my time
            </button>
            <button type="button" className="opal-center-v2-chip" onClick={() => askAboutDay("What's next?")}>
              What&apos;s next?
            </button>
            <button type="button" className="opal-center-v2-chip" onClick={() => askAboutDay("Move something")}>
              Move something
            </button>
          </div>

          <p className="opal-center-v2-footnote">
            Your graph shows only what matters. Ask naturally or tap a moment.
          </p>

          <div className="opal-center-v2-lenses" role="group" aria-label="Life graph lenses">
            <button type="button" className="opal-center-v2-lens is-active" onClick={() => setPhase("rest")}>
              Today
            </button>
            <button type="button" className="opal-center-v2-lens" onClick={() => setPhase("week")}>
              Week
            </button>
            <button type="button" className="opal-center-v2-lens" onClick={() => setPhase("family")}>
              Shared
            </button>
          </div>
        </section>
      ) : null}

      {phase === "conversation" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-conversation">
          <div className="opal-center-v2-context-pill">
            <span>Just you · Nearby · open window · permitted context</span>
            <button type="button" className="opal-center-v2-context-link" onClick={onOpenSettings}>
              Context
            </button>
          </div>

          <div className="opal-center-v2-user-bubble">
            {query.trim() || "I've got two hours. What fits me nearby?"}
          </div>

          <div className="opal-center-v2-signal">
            <img
              className="opal-center-v2-signal-orb"
              src={BRAND_ASSETS.opalCenterOpalRest645}
              alt=""
              width={32}
              height={24}
            />
            <div>
              <p className="opal-center-v2-signal-primary">
                {resolving
                  ? "Resolving with Decision Intelligence…"
                  : decision?.answer?.name
                    ? `${decision.answer.name} fits this window.`
                    : "One answer first. No setup form."}
              </p>
              <p className="opal-center-v2-signal-secondary">
                {decision?.provisional
                  ? "Provisional — confirm before anything is booked."
                  : resolveNote || "P4: high confidence means one answer."}
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
              <p className="opal-center-v2-answer-meta">
                {decision.candidate_source
                  ? `Source: ${decision.candidate_source}`
                  : decision.real
                    ? "Decision Intelligence"
                    : "No fabricated distance or traffic"}
              </p>
              <div className="opal-center-v2-answer-actions">
                <button
                  type="button"
                  className="opal-center-v2-primary"
                  data-testid="opal-center-go-with-this"
                  onClick={acceptAnswer}
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
                <button type="button" className="opal-center-v2-chip">
                  Timing
                </button>
                <button type="button" className="opal-center-v2-chip">
                  Budget
                </button>
                <button type="button" className="opal-center-v2-chip">
                  Vibe
                </button>
                <button type="button" className="opal-center-v2-chip">
                  More ideas
                </button>
              </div>
              <p className="opal-center-v2-footnote">These controls appear only because an answer exists.</p>
            </>
          ) : null}

          {provenance.length ? (
            <ul
              className="opal-center-v2-provenance"
              data-testid="opal-center-provenance"
              aria-label="Claim provenance"
            >
              {provenance.map((p) => (
                <li key={p.claim} data-source={p.source}>
                  <strong>{p.claim}</strong>
                  <span>
                    {" "}
                    · {p.source}
                    {p.detail ? ` (${p.detail})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {phase === "accepted" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-accepted">
          <p className="opal-center-v2-kicker">TODAY · UPDATED</p>
          <h1 className="opal-center-v2-title">Your graph changed.</h1>
          <p className="opal-center-v2-lede">One decision became a real point in your day.</p>

          <LifeGraphStrip nodes={dayNodes} />

          <div className="opal-center-v2-signal">
            <img
              className="opal-center-v2-signal-orb"
              src={BRAND_ASSETS.opalCenterOpalRest645}
              alt=""
              width={32}
              height={24}
            />
            <div>
              <p className="opal-center-v2-signal-primary">It&apos;s in your day.</p>
              <p className="opal-center-v2-signal-secondary">
                I&apos;ll keep the timing relevant as reality changes.
              </p>
            </div>
          </div>

          <article className="opal-center-v2-material" data-testid="opal-center-material-time">
            <p className="opal-center-v2-answer-kicker">MATERIAL TIME</p>
            <p className="opal-center-v2-material-line">Leave around 3:52 PM</p>
            <p className="opal-center-v2-answer-meta">
              Based on your current location when available. Not a countdown. Not fabricated traffic.
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
            {(["Thu", "Fri", "Sat", "Sun"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={weekDay === d}
                className={`opal-center-v2-chip ${weekDay === d ? "is-active" : ""}`}
                onClick={() => setWeekDay(d)}
              >
                {d}
              </button>
            ))}
          </div>

          <h2 className="opal-center-v2-day-name">{weekDay === "Fri" ? "Friday" : weekDay}</h2>
          <p className="opal-center-v2-lede">Your cleanest opening is 5:30–9:00 PM.</p>

          <ol className="opal-center-v2-vertical">
            {WEEK_FRIDAY.map((n) => (
              <li key={n.time}>
                <span className="opal-center-v2-dot" aria-hidden />
                <span className="opal-center-v2-vtime">{n.time}</span>
                <span className="opal-center-v2-vlabel">{n.label}</span>
              </li>
            ))}
          </ol>

          <div className="opal-center-v2-signal">
            <img
              className="opal-center-v2-signal-orb"
              src={BRAND_ASSETS.opalCenterOpalRest645}
              alt=""
              width={32}
              height={24}
            />
            <div>
              <p className="opal-center-v2-signal-primary">Want me to shape the open window?</p>
              <button type="button" className="opal-center-v2-primary" onClick={() => askAboutDay("Shape Friday open window")}>
                Yes, curate it
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {phase === "family" ? (
        <section className="opal-center-v2-body" data-testid="opal-center-family">
          <p className="opal-center-v2-kicker">SHARED · SATURDAY</p>
          <h1 className="opal-center-v2-title">Family Saturday</h1>
          <p className="opal-center-v2-lede">
            Same graph. Shared result. Private constraints stay private.
          </p>

          <ol className="opal-center-v2-vertical">
            {FAMILY_SAT.map((n) => (
              <li key={n.time}>
                <span className="opal-center-v2-dot is-shared" aria-hidden />
                <span className="opal-center-v2-vtime">{n.time}</span>
                <span className="opal-center-v2-vlabel">{n.label}</span>
              </li>
            ))}
          </ol>

          <p className="opal-center-v2-footnote">
            Solo does not disappear when a network appears. Solo compounds into interpersonal.
          </p>
          <button type="button" className="opal-center-v2-chip" onClick={() => setPhase("rest")}>
            Back to today
          </button>
        </section>
      ) : null}

      <input
        ref={attachImageRef}
        type="file"
        accept="image/*"
        className="opal-center-file-input"
        data-testid="opal-center-attach-library-input"
        onChange={() => {
          setAttachOpen(false);
          setAttachNote("Photo attached as context — Opal will use it when ingestion is available.");
        }}
      />
      <input
        ref={attachCameraRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="opal-center-file-input"
        data-testid="opal-center-attach-camera-input"
        onChange={() => {
          setAttachOpen(false);
          setAttachNote("Camera capture attached as context when the system provides a file.");
        }}
      />
      <input
        ref={attachFileRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
        className="opal-center-file-input"
        data-testid="opal-center-attach-file-input"
        onChange={() => {
          setAttachOpen(false);
          setAttachNote("Document attached as context — Opal will use it when ingestion is available.");
        }}
      />

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
            onClick={() => attachImageRef.current?.click()}
          >
            Photo library
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-attach-camera"
            onClick={() => attachCameraRef.current?.click()}
          >
            Take photo or video
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="opal-center-attach-file"
            onClick={() => attachFileRef.current?.click()}
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

      {attachNote ? (
        <p className="opal-center-v2-footnote opal-center-attach-note" role="status">
          {attachNote}
        </p>
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
            if (e.key === "Enter" && hasText) void askAboutDay();
          }}
        />
        {hasText ? (
          <button
            type="button"
            className="opal-center-send"
            data-testid="opal-center-send"
            aria-label="Send"
            onClick={() => void askAboutDay()}
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
            aria-label={listening ? "Stop listening" : "Speak to Opal"}
            aria-pressed={listening}
            onClick={() => {
              setListening((v) => !v);
              setAttachNote(
                listening
                  ? null
                  : "Listening — speech recognition is a system dependency when unavailable.",
              );
            }}
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

      {onClose ? (
        <button type="button" className="opal-center-v2-close sr-only" onClick={onClose}>
          Close Opal Center
        </button>
      ) : null}
    </div>
  );
}

function LifeGraphStrip({ nodes }: { nodes: DayNode[] }) {
  return (
    <div className="opal-life-graph" data-testid="opal-life-graph-strip" aria-label="Today life graph">
      <div className="opal-life-graph-line" aria-hidden />
      <div className="opal-life-graph-nodes">
        {nodes.map((n) => (
          <div key={n.id} className={`opal-life-graph-node is-${n.kind}`}>
            <span className="opal-life-graph-dot" aria-hidden />
            <span className="opal-life-graph-time">{n.time}</span>
            <span className="opal-life-graph-label">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
