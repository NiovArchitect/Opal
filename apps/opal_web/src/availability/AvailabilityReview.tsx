/**
 * Founder visual progression — ONE continuous conversation with Jordan.
 * External Next advances scenario time; inside phone, history accumulates.
 * Private Screen 3 overlays the same thread (inward), then returns.
 *
 * Product law: conversation is Opal’s primary social timeline.
 */
import React, { useMemo, useState } from "react";
import {
  semanticStateForSignal,
  visualShellProps,
} from "../theme/technicolorProduction";
import { resolvePrimaryOpalSurface } from "../opalUi/grammar";
import { ContextChip } from "../opalUi/ContextChip";
import { OpalInsightField } from "../opalUi/OpalInsightField";
import { OpalResolution } from "../opalUi/OpalResolution";
import { OpalThreadMoment } from "../opalUi/OpalThreadMoment";
import type { ThreadOpalMoment } from "../opalUi/threadHistory";
import type { AvailabilityOverlap } from "../api/productClient";

type Msg = { id: string; from: "them" | "me"; body: string };

type Step = {
  metaTitle: string;
  messages: Msg[];
  history: ThreadOpalMoment[];
  signal?: string;
  findTimeOpen?: boolean;
  hasPrivateWindows?: boolean;
  overlap?: AvailabilityOverlap | null;
  overlapExpanded?: boolean;
  /** Live Set resolution event (before historical settle) */
  setLive?: boolean;
  setDetail?: string;
};

const oneOverlap: AvailabilityOverlap = {
  label: "This could work",
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
  label: "A couple times could work",
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

/**
 * Continuous scenario: same peer, accumulating messages + Opal history.
 * Index = external "time advances" — not separate mini-apps.
 */
const STEPS: Step[] = [
  {
    metaTitle: "Quiet",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
    ],
    history: [],
  },
  {
    // Screen 2 — chip IN thread, chat stays
    metaTitle: "Find a time",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
    ],
    history: [],
    signal: "plan_forming",
  },
  {
    // Screen 3 — private inward overlay on SAME thread
    metaTitle: "Private times",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
    ],
    history: [],
    signal: "plan_forming",
    findTimeOpen: true,
  },
  {
    // Screen 4 — back in conversation after share (history continues)
    metaTitle: "Back in conversation",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
    ],
    history: [],
    signal: "open_loop",
  },
  {
    metaTitle: "Shared result",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
    ],
    history: [],
    signal: "open_loop",
    overlap: twoOverlap,
    overlapExpanded: false,
  },
  {
    metaTitle: "Possibilities",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
    ],
    history: [],
    signal: "open_loop",
    overlap: twoOverlap,
    overlapExpanded: true,
  },
  {
    metaTitle: "Human reply",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
      {
        id: "m3",
        from: "me",
        body: "Thursday after 6:30 works for me — does that work for you?",
      },
    ],
    history: [
      {
        id: "h-result",
        kind: "result",
        label: "Thursday could work",
        detail: "after 6:30",
        age: "recent",
      },
    ],
    signal: "open_loop",
  },
  {
    metaTitle: "Set",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
      {
        id: "m3",
        from: "me",
        body: "Thursday after 6:30 works for me — does that work for you?",
      },
      { id: "m4", from: "them", body: "Perfect — let's do it." },
    ],
    history: [
      {
        id: "h-result",
        kind: "result",
        label: "Thursday could work",
        detail: "after 6:30",
        age: "historical",
      },
    ],
    signal: "set",
    setLive: true,
    setDetail: "Thursday · after 6:30",
  },
  {
    metaTitle: "History settles",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
      {
        id: "m3",
        from: "me",
        body: "Thursday after 6:30 works for me — does that work for you?",
      },
      { id: "m4", from: "them", body: "Perfect — let's do it." },
      { id: "m5", from: "me", body: "Can't wait — see you Thursday." },
    ],
    history: [
      {
        id: "h-result",
        kind: "result",
        label: "Thursday could work",
        detail: "after 6:30",
        age: "historical",
      },
      {
        id: "h-set",
        kind: "set",
        label: "Set",
        detail: "Thursday · after 6:30",
        age: "historical",
      },
    ],
  },
  {
    metaTitle: "Keep talking",
    messages: [
      { id: "m1", from: "them", body: "How was your week?" },
      {
        id: "m2",
        from: "them",
        body: "We really need to hang out this week.",
      },
      {
        id: "m3",
        from: "me",
        body: "Thursday after 6:30 works for me — does that work for you?",
      },
      { id: "m4", from: "them", body: "Perfect — let's do it." },
      { id: "m5", from: "me", body: "Can't wait — see you Thursday." },
      { id: "m6", from: "them", body: "Want to grab tacos after?" },
    ],
    history: [
      {
        id: "h-result",
        kind: "result",
        label: "Thursday could work",
        detail: "after 6:30",
        age: "historical",
      },
      {
        id: "h-set",
        kind: "set",
        label: "Set",
        detail: "Thursday · after 6:30",
        age: "historical",
      },
    ],
  },
];

function ContinuousPhone({ step }: { step: Step }) {
  const primary = useMemo(
    () =>
      resolvePrimaryOpalSurface({
        signalKind: step.signal,
        overlap: step.overlap ?? null,
        findTimeOpen: step.findTimeOpen,
        hasPrivateWindows: step.hasPrivateWindows,
        overlapExpanded: step.overlapExpanded,
      }),
    [step],
  );

  // When set is live, resolution event owns the active surface
  const showChip = primary.kind === "chip" && !step.findTimeOpen;
  const showOverlap = primary.kind === "overlap" && !step.setLive;
  const showPrivate = Boolean(step.findTimeOpen);

  return (
    <div
      className="review-phone"
      data-testid="review-phone"
      style={{
        position: "relative",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 28,
        overflow: "hidden",
        background: "#07090E",
        minHeight: 560,
        width: "100%",
        maxWidth: 360,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
      }}
    >
      <header
        className="chat-header glass"
        style={{ position: "relative", height: 56, flexShrink: 0 }}
      >
        <div className="chat-header-meta" style={{ paddingLeft: 14 }}>
          <div className="chat-header-name">Jordan Lee</div>
          <div className="chat-header-sub">Friends</div>
        </div>
      </header>

      {step.setLive ? (
        <div data-testid="review-set">
          <OpalResolution detail={step.setDetail} />
        </div>
      ) : null}

      <div
        className="thread"
        style={{ flex: 1, minHeight: 200, padding: 12, overflow: "auto" }}
        data-testid="review-thread"
      >
        {step.messages.map((m) => (
          <div
            key={m.id}
            className={`bubble-row ${m.from === "me" ? "out" : "in"}`}
          >
            <div className={`bubble ${m.from === "me" ? "out" : "in"}`}>
              <p>{m.body}</p>
              <time>Now</time>
            </div>
          </div>
        ))}

        {/* Historical / recent Opal — quiet, thread-anchored */}
        {step.history.map((h) => (
          <OpalThreadMoment key={h.id} moment={h} />
        ))}

        {showOverlap ? (
          primary.overlaps.length === 1 || step.overlapExpanded ? (
            <div data-testid="review-expand">
              <OpalInsightField
                insight={primary.label}
                groupLine={primary.groupLine}
                discovery={primary.overlaps.length === 1}
                options={
                  primary.overlaps.length === 1
                    ? [{ id: "one", label: "Thursday after 6:30" }]
                    : [
                        { id: "thu", label: "Thursday after 6:30" },
                        { id: "sun", label: "Sunday after 4" },
                      ]
                }
                onChoose={() => undefined}
              />
            </div>
          ) : (
            <div
              className="opal-moment inline moment-enter signal-availability_overlap has-detail"
              role="status"
              data-state={semanticStateForSignal("availability_overlap")}
              data-testid="review-overlap"
            >
              <span className="opal-moment-mark" aria-hidden>
                ◈
              </span>
              <span className="opal-moment-label">{primary.label}</span>
              <span className="opal-moment-detail">Tap to see</span>
            </div>
          )
        ) : null}
      </div>

      {showChip ? (
        <div className="opal-context-chip-wrap opal-chip-edge">
          <ContextChip label="Find a time" onClick={() => undefined} />
        </div>
      ) : null}

      <form
        className={`composer glass${
          showChip ? " has-opal-context" : ""
        }${step.setLive ? " has-opal-set" : ""}`}
        onSubmit={(e) => e.preventDefault()}
        style={{ flexShrink: 0 }}
      >
        <input
          className="composer-input"
          placeholder="Message"
          readOnly
          aria-label="Message"
        />
      </form>

      {/* Private: inward focus on SAME conversation — chat still visible above */}
      {showPrivate ? (
        <div
          className="opal-private-overlay"
          data-testid="review-sheet-mock"
          data-private="true"
        >
          <div className="opal-private-field">
            <div className="opal-private-field-header">
              <div className="opal-private-field-title-row">
                <span className="opal-private-mark" aria-hidden>
                  ◆
                </span>
                <h2 style={{ fontSize: "1rem", margin: 0 }}>When could work?</h2>
              </div>
            </div>
            <p className="opal-private-hint-line">Only you can see this</p>
            <ul className="opal-private-possibilities">
              <li>
                <div className="opal-private-possibility is-mine">
                  <span className="opal-private-possibility-contour" aria-hidden />
                  <span className="opal-private-possibility-label">
                    <span className="opal-private-mark" aria-hidden>
                      ◆
                    </span>
                    Thursday after 6
                  </span>
                </div>
              </li>
              <li>
                <div className="opal-private-possibility is-mine">
                  <span className="opal-private-possibility-contour" aria-hidden />
                  <span className="opal-private-possibility-label">
                    <span className="opal-private-mark" aria-hidden>
                      ◆
                    </span>
                    Sunday afternoon
                  </span>
                </div>
              </li>
            </ul>
            <button type="button" className="opal-private-action exit">
              Share these times
              <span className="opal-private-action-cue" aria-hidden>
                →
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AvailabilityReview() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index] ?? STEPS[0];
  const shell = visualShellProps("member");
  const total = STEPS.length;
  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div
      data-testid="availability-review"
      {...shell}
      className={`app app-futura ${shell.className ?? ""}`.trim()}
      style={{
        minHeight: "100vh",
        padding: "16px 12px 28px",
        maxWidth: 420,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div data-testid="review-chrome">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn ghost"
            disabled={!canPrev}
            style={{ minHeight: 40, minWidth: 88, opacity: canPrev ? 1 : 0.35 }}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            aria-label="Previous step"
          >
            Previous
          </button>
          <span
            className="muted-lede"
            data-testid="review-step"
            style={{ fontSize: "0.8rem", fontVariantNumeric: "tabular-nums" }}
          >
            {index + 1} / {total}
          </span>
          <button
            type="button"
            className="btn ghost"
            disabled={!canNext}
            style={{ minHeight: 40, minWidth: 88, opacity: canNext ? 1 : 0.35 }}
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            aria-label="Next step"
          >
            Next
          </button>
        </div>
        <p
          className="muted-lede"
          data-testid="review-meta"
          style={{
            margin: "8px 0 0",
            fontSize: "0.72rem",
            textAlign: "center",
            opacity: 0.65,
          }}
        >
          {step.metaTitle}
        </p>
      </div>

      <ContinuousPhone step={step} />
    </div>
  );
}
