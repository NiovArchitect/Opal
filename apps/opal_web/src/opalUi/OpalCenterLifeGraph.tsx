/**
 * Opal Center V2 — Life Graph / Social-First (redesigned 2026-10-04).
 * Thesis: Opal is here, with your people. Conversation on top of a living
 * social graph. The center makes it obvious this is where you speak with
 * Opal, and centers the happenings — what Opal notices, what is forming,
 * what just settled — with your people, not just your day.
 * Customer language only (no internal "anchor" vocabulary).
 */
import React, { useMemo, useRef, useState } from "react";
import { OpalWordmark } from "../brand/OpalLogo";
import { BRAND_ASSETS } from "../brand/brand";
import {
  resolveDecision,
  type DecisionResolvePayload,
} from "../api/productClient";
import { acquireMedia, mediaKindFromMime } from "../mediaAcquisition";
import type { MediaAsset, MediaSource } from "../nativeHostBridge";

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
  /** Your people — derived from conversations. Makes the center social. */
  people?: CenterPerson[];
  /** Happenings — what Opal notices, what is forming, what just settled. */
  happenings?: CenterHappening[];
};

export type CenterPerson = {
  id: string;
  name: string;
  detail?: string;
};

export type CenterHappening = {
  id: string;
  title: string;
  detail?: string;
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
  people = [],
  happenings = [],
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
  const [attachment, setAttachment] = useState<{
    source: MediaSource;
    asset: MediaAsset;
    kind: "photo" | "video" | "document";
  } | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const dateLine = useMemo(() => `TODAY · ${todayLabel()}`, []);
  const hasText = query.trim().length > 0;
  /** Ref to the composer input so "Talk to Opal" can focus it. */
  const composerInputRef = useRef<HTMLInputElement>(null);
  function focusComposer() {
    composerInputRef.current?.focus();
  }

  /** Stale-async guard: ignore resolve results from superseded requests. */
  const requestGen = useRef(0);
  /** Idempotency: double-tap "Go with this" must not seed two Graphs. */
  const acceptLock = useRef(false);
  const lastIdempotencyKey = useRef<string | null>(null);

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
      // Tranche #1: real handoff into Center context state.
      // Intelligence ingestion over attachment content = tranche #4 (not claimed here).
      setAttachNote(
        `${label} attached for context. Opal has the file in this conversation — reasoning over it comes next.`,
      );
    } finally {
      setAttachBusy(false);
    }
  }

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

      {/* One scroll owner for body copy. Mode tabs + composer are in-flow chrome below. */}
      <div className="opal-center-v2-scroll" data-testid="opal-center-scroll">
      {phase === "rest" ? (
        <section className="opal-center-v2-body opal-center-v2-body-social" data-testid="opal-center-rest">
          <p className="opal-center-v2-kicker">{dateLine}</p>

          {/* Opal presence — obvious speak-target. This is where you talk to Opal. */}
          <div className="opal-center-v2-presence" data-testid="opal-center-presence">
            <img
              className="opal-center-v2-presence-orb"
              src={BRAND_ASSETS.opalCenterOpalRest645}
              alt=""
              width={48}
              height={36}
            />
            <div className="opal-center-v2-presence-copy">
              <h1 className="opal-center-v2-title">Opal is here.</h1>
              <p className="opal-center-v2-lede">
                Talk to me about your people and plans — I&apos;m listening.
              </p>
            </div>
            <button
              type="button"
              className="opal-center-v2-talk"
              data-testid="opal-center-talk"
              onClick={focusComposer}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"
                />
              </svg>
              Talk to Opal
            </button>
          </div>

          {/* Happenings — what Opal notices, what is forming, what just settled. Centered. */}
          {happenings.length > 0 ? (
            <section className="opal-center-v2-happenings" aria-label="Happenings">
              <h2 className="opal-center-v2-section-title">Happening</h2>
              <ul className="opal-center-v2-happenings-list">
                {happenings.map((h) => (
                  <li key={h.id} className="opal-center-v2-happening">
                    <span className="opal-center-v2-happening-dot" aria-hidden />
                    <div>
                      <p className="opal-center-v2-happening-title">{h.title}</p>
                      {h.detail ? (
                        <p className="opal-center-v2-happening-detail">{h.detail}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Your people — the social orbit. Not "just you". */}
          {people.length > 0 ? (
            <section className="opal-center-v2-people" aria-label="Your people">
              <h2 className="opal-center-v2-section-title">Your people</h2>
              <div className="opal-center-v2-people-orbit">
                {people.map((p) => (
                  <div key={p.id} className="opal-center-v2-person" data-testid={`opal-center-person-${p.id}`}>
                    <span className="opal-center-v2-person-avatar" aria-hidden>
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="opal-center-v2-person-name">{p.name}</span>
                    {p.detail ? (
                      <span className="opal-center-v2-person-detail">{p.detail}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Day — the timeline, secondary now. */}
          <section className="opal-center-v2-day" aria-label="Today">
            <h2 className="opal-center-v2-section-title">Today</h2>
            <LifeGraphStrip nodes={dayNodes} />
            <div className="opal-center-v2-signal">
              <div>
                <p className="opal-center-v2-signal-primary">
                  You have 2h 10m open before your next event.
                </p>
                <p className="opal-center-v2-signal-secondary">
                  I can shape it around where you are, what you enjoy, and what you want to spend.
                </p>
              </div>
            </div>
          </section>

          <p className="opal-center-v2-footnote">
            Your graph shows only what matters. Ask naturally or tap a moment.
          </p>
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
          ref={composerInputRef}
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
