/**
 * Founder review — CONTENT CONTINUITY.
 * Visuals frozen (layout/material/motion approved).
 *
 * A. REAL THREAD — one chronological Jordan conversation
 * B. VARIANTS — multi-overlap / group (not next chapters of the story)
 *
 * Outside phone: Previous / step / Next + meta only.
 * Inside phone: product only.
 */
import React, { useMemo, useState } from "react";
import {
  semanticStateForSignal,
  visualShellProps,
} from "../theme/technicolorProduction";
import {
  resolvePrimaryOpalSurface,
  type PrimaryOpalSurface,
} from "../opalUi/grammar";
import { ContextChip } from "../opalUi/ContextChip";
import { PrivateGuidance } from "../opalUi/PrivateGuidance";
import { OpalInsightField } from "../opalUi/OpalInsightField";
import { OpalResolution } from "../opalUi/OpalResolution";
import type { AvailabilityOverlap } from "../api/productClient";

type Msg = { from: "them" | "me"; body: string };

type Fixture = {
  id: string;
  /** External chrome only */
  metaTitle: string;
  signal?: string;
  findTimeOpen?: boolean;
  hasPrivateWindows?: boolean;
  privateDismissed?: string[];
  overlap?: AvailabilityOverlap | null;
  overlapExpanded?: boolean;
  messages: Msg[];
  peerName: string;
  peerSub?: string;
  showSheetMock?: boolean;
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

const groupOverlap: AvailabilityOverlap = {
  label: "A couple times could work",
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

/** Shared opening of the real chronological thread (accumulates). */
const T = {
  m1: { from: "them" as const, body: "How was your week?" },
  m2: { from: "me" as const, body: "Long 😭 but good. Feel like I haven’t seen you in forever." },
  m3: { from: "them" as const, body: "I know lol. We need to fix that." },
  m4: { from: "me" as const, body: "Seriously. What’s your week looking like?" },
  m5: { from: "them" as const, body: "Thursday might work actually." },
  // after private / before share result
  m6: { from: "me" as const, body: "Ok I put a couple times in" },
  m7: { from: "them" as const, body: "I can do Thursday after 6:30 for sure" },
  // after Opal surfaces one time
  m8: { from: "me" as const, body: "Thursday after 6:30 works for me — does that work for you?" },
  m9: { from: "them" as const, body: "Yeah Thursday works. Let’s do it." },
  // post-set
  m10: { from: "me" as const, body: "Perfect 😊 looking forward to it" },
  m11: { from: "them" as const, body: "Same. See you then" },
};

/**
 * A. REAL CHRONOLOGICAL JOURNEY
 * Quiet → desire → Find a time → private → share waiting →
 * peer signal → shared result → human agreement → Set → calm
 */
const REAL_THREAD: Fixture[] = [
  {
    id: "quiet",
    metaTitle: "1 · Quiet",
    messages: [T.m1],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "catch-up",
    metaTitle: "2 · Catching up",
    messages: [T.m1, T.m2, T.m3, T.m4],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "find-time",
    metaTitle: "3 · Find a time",
    // Trigger: plan_forming after humans want to meet + Thursday mentioned
    signal: "plan_forming",
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "private-times",
    metaTitle: "4 · Private times",
    // Trigger: user opened Find a time
    signal: "plan_forming",
    findTimeOpen: true,
    showSheetMock: true,
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "share-ready",
    metaTitle: "5 · Share when ready",
    // Trigger: owner has private windows, not yet shared (or waiting)
    hasPrivateWindows: true,
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5, T.m6],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "peer-share",
    metaTitle: "6 · Jordan can Thursday",
    // Narrative basis before overlap: Jordan states compatible availability
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5, T.m6, T.m7],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "one-time",
    metaTitle: "7 · This could work",
    // Trigger: both shared-compatible → single overlap
    signal: "open_loop",
    overlap: oneOverlap,
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5, T.m6, T.m7],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "human-pick",
    metaTitle: "8 · You pick Thursday",
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5, T.m6, T.m7, T.m8],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "jordan-agrees",
    metaTitle: "9 · Jordan agrees",
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5, T.m6, T.m7, T.m8, T.m9],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "set",
    metaTitle: "10 · Set",
    // Trigger: shared human agreement (AlignmentAuthority path in product)
    signal: "set",
    setDetail: "Thursday · after 6:30",
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5, T.m6, T.m7, T.m8, T.m9],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "calm",
    metaTitle: "11 · Calm",
    messages: [T.m1, T.m2, T.m3, T.m4, T.m5, T.m6, T.m7, T.m8, T.m9, T.m10, T.m11],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
];

/**
 * B. VARIANTS — not chronological next steps of REAL_THREAD
 */
const VARIANTS: Fixture[] = [
  {
    id: "variant-multi",
    metaTitle: "Variant · couple times",
    // Same early story, alternate cardinality (not after one-time in the real path)
    signal: "open_loop",
    overlap: twoOverlap,
    overlapExpanded: true,
    messages: [
      T.m1,
      T.m2,
      T.m3,
      T.m4,
      { from: "them", body: "Thursday or Sunday could work for me" },
      { from: "me", body: "Same — I put both in" },
    ],
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "variant-group",
    metaTitle: "Variant · group",
    signal: "open_loop",
    overlap: groupOverlap,
    overlapExpanded: true,
    messages: [
      { from: "them", body: "Are we still doing Saturday?" },
      { from: "me", body: "I’m down after 5" },
      { from: "them", body: "Same — 6ish works" },
    ],
    peerName: "Saturday dinner",
    peerSub: "4 people",
  },
];

const FIXTURES: Fixture[] = [...REAL_THREAD, ...VARIANTS];

function PhoneSurface({
  primary,
  fixture,
}: {
  primary: PrimaryOpalSurface;
  fixture: Fixture;
}) {
  return (
    <div
      className="review-phone"
      data-testid="review-phone"
      style={{
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
          <div className="chat-header-name">{fixture.peerName}</div>
          {fixture.peerSub ? (
            <div className="chat-header-sub">{fixture.peerSub}</div>
          ) : null}
        </div>
      </header>

      {primary.kind === "set" ? (
        <div data-testid="review-set">
          <OpalResolution detail={fixture.setDetail ?? "Thursday · after 6:30"} />
        </div>
      ) : null}

      <div
        className="thread"
        style={{ flex: 1, minHeight: 220, padding: 12, overflow: "auto" }}
        data-testid="review-thread"
      >
        {fixture.messages.map((m, i) => (
          <div
            key={`${i}-${m.body.slice(0, 12)}`}
            className={`bubble-row ${m.from === "me" ? "out" : "in"}`}
          >
            <div className={`bubble ${m.from === "me" ? "out" : "in"}`}>
              <p>{m.body}</p>
              <time>{i === fixture.messages.length - 1 ? "Now" : ""}</time>
            </div>
          </div>
        ))}

        {primary.kind === "chip" ? (
          <div
            className={`opal-context-chip-wrap${
              primary.withEdge ? " opal-chip-edge" : ""
            }`}
          >
            <ContextChip label={primary.label} onClick={() => undefined} />
          </div>
        ) : null}

        {primary.kind === "private" ? (
          <PrivateGuidance
            text={primary.text}
            onDismiss={() => undefined}
          />
        ) : null}

        {primary.kind === "overlap" ? (
          primary.overlaps.length === 1 || primary.expand ? (
            <div data-testid="review-expand">
              <OpalInsightField
                insight={primary.label}
                groupLine={primary.groupLine}
                discovery={primary.overlaps.length === 1}
                options={
                  primary.overlaps.length === 1
                    ? [{ id: "one", label: "Thursday after 6:30" }]
                    : [
                        { id: "thu", label: "Thursday evening" },
                        { id: "sun", label: "Sunday afternoon" },
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

        {fixture.showSheetMock && primary.kind === "sheet" ? (
          <div
            className="opal-private-field"
            style={{
              position: "relative",
              marginTop: 8,
              maxHeight: "none",
              width: "100%",
            }}
            data-testid="review-sheet-mock"
            data-private="true"
          >
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
                    Thursday after 6:30
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
                    Sunday after 4
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
        ) : null}
      </div>

      <form
        className={`composer glass${
          primary.kind === "chip" || primary.kind === "private"
            ? " has-opal-context"
            : ""
        }${primary.kind === "set" ? " has-opal-set" : ""}`}
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
    </div>
  );
}

export function AvailabilityReview() {
  const [index, setIndex] = useState(0);
  const fixture = FIXTURES[index] ?? FIXTURES[0];
  const shell = visualShellProps("member");

  const primary = useMemo(
    () =>
      resolvePrimaryOpalSurface({
        signalKind: fixture.signal,
        overlap: fixture.overlap ?? null,
        findTimeOpen: fixture.findTimeOpen,
        hasPrivateWindows: fixture.hasPrivateWindows,
        privateDismissed: new Set(fixture.privateDismissed ?? []),
        overlapExpanded: fixture.overlapExpanded,
      }),
    [fixture],
  );

  const total = FIXTURES.length;
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
      <div
        data-testid="review-chrome"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
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
            margin: 0,
            fontSize: "0.72rem",
            textAlign: "center",
            opacity: 0.65,
          }}
        >
          {fixture.metaTitle}
        </p>
      </div>

      <PhoneSurface primary={primary} fixture={fixture} />
    </div>
  );
}
