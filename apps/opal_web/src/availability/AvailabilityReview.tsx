/**
 * Founder visual progression review (mobile-width).
 * ?review=availability or #/review/availability
 *
 * Inside the phone: product-facing copy only.
 * Outside: scene chrome + short guide notes.
 *
 * Faithful to OpalApp: no dual chip+moment, no internal design rationale,
 * group count only when participant_count is real, private nudge needs windows.
 */
import React, { useState } from "react";
import {
  semanticStateForSignal,
  visualShellProps,
} from "../theme/technicolorProduction";
import {
  contextChipLabel,
  groupShareCountLine,
  privateGuidanceCopy,
} from "../opalUi/grammar";
import { ContextChip } from "../opalUi/ContextChip";
import { PrivateGuidance } from "../opalUi/PrivateGuidance";
import type { AvailabilityOverlap } from "../api/productClient";

type Scene = {
  id: string;
  letter: string;
  title: string;
  signal?: string;
  signalLabel?: string;
  edge?: boolean;
  /** Force chip label; omit to derive from product grammar. */
  chip?: string | null;
  privateText?: string | null;
  hasPrivateWindows?: boolean;
  overlap?: AvailabilityOverlap | null;
  expand?: boolean;
  set?: boolean;
  /** Outside-phone guide only — never rendered inside the simulated device. */
  note?: string;
};

const oneOverlap: AvailabilityOverlap = {
  label: "One time works for both of you.",
  overlap_status: "overlap_found",
  overlaps: [
    {
      display_start: "2026-08-14T01:30:00.000Z",
      display_end: "2026-08-14T04:00:00.000Z",
      timezone: "UTC",
      shared_safe: true as const,
    },
  ],
  no_private_schedule: true as const,
  participant_count: 2,
};

const twoOverlap: AvailabilityOverlap = {
  label: "A couple times could work.",
  overlap_status: "overlap_found",
  overlaps: [
    {
      display_start: "2026-08-14T01:30:00.000Z",
      display_end: "2026-08-14T04:00:00.000Z",
      timezone: "UTC",
      shared_safe: true as const,
    },
    {
      display_start: "2026-08-16T20:00:00.000Z",
      display_end: "2026-08-16T23:00:00.000Z",
      timezone: "UTC",
      shared_safe: true as const,
    },
  ],
  no_private_schedule: true as const,
  participant_count: 2,
};

const groupOverlap: AvailabilityOverlap = {
  label: "A couple times could work.",
  overlap_status: "overlap_found",
  overlaps: [
    {
      display_start: "2026-08-16T20:00:00.000Z",
      display_end: "2026-08-16T23:00:00.000Z",
      timezone: "UTC",
      shared_safe: true as const,
    },
    {
      display_start: "2026-08-17T18:00:00.000Z",
      display_end: "2026-08-17T21:00:00.000Z",
      timezone: "UTC",
      shared_safe: true as const,
    },
  ],
  no_private_schedule: true as const,
  participant_count: 4,
};

const SCENES: Scene[] = [
  {
    id: "quiet",
    letter: "A",
    title: "Quiet conversation",
    note: "No Edge. No chip. Human chat only.",
  },
  {
    id: "edge",
    letter: "B",
    title: "Opal Edge",
    signal: "plan_forming",
    signalLabel: "Becoming a plan",
    edge: true,
    note: "Edge appears once — useful state, not a new message.",
  },
  {
    id: "find",
    letter: "C",
    title: "Find a time chip",
    signal: "plan_forming",
    signalLabel: "Becoming a plan",
    edge: true,
    chip: "Find a time",
    note: "One forward action. Not a permanent AI button.",
  },
  {
    id: "private",
    letter: "D",
    title: "Private guidance",
    signal: "open_loop",
    signalLabel: "We're still working this out",
    hasPrivateWindows: true,
    privateText: "Share a couple times that work when you're ready.",
    note: "Dominant violet = only you. Outside phone: proactive private nudge.",
  },
  {
    id: "select",
    letter: "E",
    title: "Private selection (sheet)",
    signal: "open_loop",
    signalLabel: "We're still working this out",
    note: "Sheet: When could you meet? Only you can see this list.",
  },
  {
    id: "overlap",
    letter: "F",
    title: "Shared overlap",
    signal: "open_loop",
    signalLabel: "This could work",
    edge: true,
    // No chip — Expanded Moment owns the payoff (matches product).
    chip: null,
    overlap: oneOverlap,
    note: "Insight payoff. No duplicate Context Chip.",
  },
  {
    id: "expand",
    letter: "G",
    title: "Expanded moment",
    signal: "open_loop",
    signalLabel: "A couple options fit",
    edge: true,
    chip: null,
    overlap: twoOverlap,
    expand: true,
    note: "Temporary reveal. Collapses after choice.",
  },
  {
    id: "still",
    letter: "H",
    title: "Still open (vibe copy)",
    signal: "open_loop",
    signalLabel: "We're still working this out",
    note: "Natural language — not a debug status string.",
  },
  {
    id: "set",
    letter: "I",
    title: "Set (authoritative)",
    signal: "set",
    signalLabel: "Set",
    set: true,
    note: "Completion emerald only after AlignmentAuthority.",
  },
  {
    id: "group",
    letter: "J",
    title: "Small group",
    signal: "open_loop",
    signalLabel: "A couple options fit",
    edge: true,
    chip: null,
    overlap: groupOverlap,
    expand: true,
    note: "Group count from real participant_count when ≥3. No roster.",
  },
  {
    id: "reduced",
    letter: "K",
    title: "Reduced motion",
    signal: "open_loop",
    signalLabel: "This could work",
    edge: true,
    chip: null,
    overlap: oneOverlap,
    note: "Edge resting glow survives without animation.",
  },
];

export function AvailabilityReview() {
  const [sceneId, setSceneId] = useState(SCENES[0].id);
  const [privateDismissed, setPrivateDismissed] = useState(false);
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const shell = visualShellProps("member");

  const overlap = scene.overlap ?? null;

  // Product grammar — same as OpalApp (null when overlap_found).
  const chip =
    scene.chip !== undefined
      ? scene.chip
      : contextChipLabel({
          signalKind: scene.signal as "plan_forming" | "open_loop" | undefined,
          overlap,
        });

  const guidanceFromGrammar = privateGuidanceCopy({
    overlap:
      scene.hasPrivateWindows && !overlap
        ? {
            label: "",
            overlap_status: "need_more_shares",
            overlaps: [],
            no_private_schedule: true,
          }
        : overlap,
    hasPrivateWindows: Boolean(scene.hasPrivateWindows),
  });

  const guidanceText =
    scene.privateText && !privateDismissed
      ? scene.privateText
      : guidanceFromGrammar && !privateDismissed
        ? guidanceFromGrammar.text
        : null;
  const guidanceQuiet = Boolean(guidanceFromGrammar?.quiet);

  const groupLine = groupShareCountLine(overlap);

  return (
    <div
      data-testid="availability-review"
      {...shell}
      className={`app app-futura ${shell.className ?? ""}`.trim()}
      style={{ minHeight: "100vh", padding: 12, maxWidth: 390, margin: "0 auto" }}
    >
      <h1 style={{ fontSize: "1rem", marginBottom: 4 }}>Opal journey review</h1>
      <p className="muted-lede" style={{ marginBottom: 12, fontSize: "0.75rem" }}>
        Quiet → notice → act → resolve → calm. Reward only when uncertainty drops.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="btn ghost"
            style={{ minHeight: 36, padding: "4px 8px", fontSize: "0.72rem" }}
            onClick={() => {
              setSceneId(s.id);
              setPrivateDismissed(false);
            }}
            aria-pressed={sceneId === s.id}
          >
            {s.letter}. {s.title}
          </button>
        ))}
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
          background: "#07090E",
          minHeight: 420,
        }}
        data-testid={`review-scene-${scene.id}`}
      >
        <header
          className="chat-header glass"
          style={{ position: "relative", height: 56 }}
        >
          <div className="chat-header-meta" style={{ paddingLeft: 12 }}>
            <div className="chat-header-name">
              {scene.id === "group" ? "Saturday dinner" : "Jordan Lee"}
            </div>
            <div className="chat-header-sub">
              {scene.id === "group" ? "4 people" : "Friends"}
            </div>
          </div>
        </header>

        {scene.signalLabel ? (
          <div
            className={`opal-moment journey signal-${scene.signal}${
              scene.edge ? " opal-edge opal-edge-animate" : ""
            }${scene.set ? " signal-set" : ""}`}
            role="status"
            data-state={semanticStateForSignal(scene.signal)}
            data-opal-edge={scene.edge ? "true" : "false"}
            data-testid="review-edge"
          >
            <span className="opal-moment-mark" aria-hidden>
              ◈
            </span>
            <span className="opal-moment-label">{scene.signalLabel}</span>
          </div>
        ) : null}

        <div className="thread" style={{ minHeight: 180, padding: 12 }}>
          <div className="bubble-row in">
            <div className="bubble in">
              <p>
                {scene.id === "quiet"
                  ? "How was your week?"
                  : "We should actually hang out this week."}
              </p>
              <time>Now</time>
            </div>
          </div>

          {overlap?.overlap_status === "overlap_found" ? (
            <div
              className={`opal-moment inline moment-enter signal-availability_overlap has-detail`}
              role="status"
              data-state={semanticStateForSignal("availability_overlap")}
              data-testid="review-overlap"
            >
              <span className="opal-moment-mark" aria-hidden>
                ◈
              </span>
              <span className="opal-moment-label">
                {overlap.overlaps.length === 1
                  ? "This could work"
                  : "A couple times could work"}
              </span>
              {groupLine ? (
                <span className="opal-group-share-count">{groupLine}</span>
              ) : null}
              {overlap.overlaps.length === 1 ? (
                <span className="opal-moment-detail">Thursday evening</span>
              ) : (
                <span className="opal-moment-detail">
                  A couple options · tap to see
                </span>
              )}
            </div>
          ) : null}

          {scene.expand && overlap && overlap.overlaps.length >= 2 ? (
            <div
              className="opal-moment-expand"
              data-testid="review-expand"
              role="group"
              aria-label="Times that could work"
            >
              <p className="opal-moment-expand-kicker">
                ◈ A couple times could work
              </p>
              <button type="button" className="btn ghost">
                Thursday evening
              </button>
              <button type="button" className="btn ghost">
                Sunday after 4
              </button>
            </div>
          ) : null}

          {scene.id === "select" ? (
            <div
              className="lumen-card"
              style={{ padding: 12, marginTop: 12 }}
              data-testid="review-sheet-mock"
            >
              <strong>When could you meet?</strong>
              <p className="permission-line">Only you can see this list.</p>
              <p className="muted-lede">Thursday after 6 · Sunday afternoon</p>
            </div>
          ) : null}
        </div>

        {guidanceText ? (
          <PrivateGuidance
            text={guidanceText}
            quiet={guidanceQuiet}
            onDismiss={() => setPrivateDismissed(true)}
          />
        ) : null}

        {chip && !scene.set ? (
          <div className="opal-context-chip-wrap">
            <ContextChip label={chip} onClick={() => undefined} />
          </div>
        ) : null}

        <form
          className={`composer glass${
            chip || guidanceText ? " has-opal-context" : ""
          }`}
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            className="composer-input"
            placeholder="Message"
            readOnly
            aria-label="Composer preview"
          />
        </form>
      </div>

      <p className="muted-lede" style={{ marginTop: 12, fontSize: "0.75rem" }}>
        <strong>{scene.letter}.</strong> {scene.note}
      </p>
    </div>
  );
}
