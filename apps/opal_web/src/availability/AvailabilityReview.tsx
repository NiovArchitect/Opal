/**
 * Founder visual progression (mobile-width).
 * ?review=availability or #/review/availability
 *
 * CRITICAL SEPARATION:
 * - Outside phone: developer Previous/Next + step counter only.
 * - Inside phone: EXACTLY what a real user would see — conversation + at most
 *   one Opal surface. No state menus, no design taxonomy, no slogans.
 *
 * Product law: one meaningful Opal surface at a time.
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

type Fixture = {
  id: string;
  /** External metadata only — never rendered inside the phone. */
  metaTitle: string;
  signal?: string;
  findTimeOpen?: boolean;
  hasPrivateWindows?: boolean;
  privateDismissed?: string[];
  overlap?: AvailabilityOverlap | null;
  overlapExpanded?: boolean;
  /** Primary bubble; optional extra prior bubbles for continuity (Screens 2/4). */
  message: string;
  priorMessages?: string[];
  peerName: string;
  peerSub?: string;
  showSheetMock?: boolean;
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

/**
 * Fixtures drive internal state only.
 * metaTitle is for external chrome — never inside the device.
 */
const FIXTURES: Fixture[] = [
  {
    id: "quiet",
    metaTitle: "Quiet",
    message: "How was your week?",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    // Screen 2: chip stays in same chat (continuity only — same Opal material as 21fc18b)
    id: "edge-chip",
    metaTitle: "Find a time",
    signal: "plan_forming",
    priorMessages: ["How was your week?"],
    message: "We really need to hang out this week.",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    // Screen 3: Private Opal Field — restored exact 21fc18b material
    id: "sheet",
    metaTitle: "Private times",
    signal: "plan_forming",
    findTimeOpen: true,
    showSheetMock: true,
    priorMessages: ["How was your week?"],
    message: "We really need to hang out this week.",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "private-only",
    metaTitle: "Private nudge",
    hasPrivateWindows: true,
    priorMessages: ["How was your week?"],
    message: "We really need to hang out this week.",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    // Screen 4: back in same conversation after private (continuity only)
    id: "after-share",
    metaTitle: "After share",
    priorMessages: ["How was your week?"],
    message: "We really need to hang out this week.",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    // Screen 5: restored 21fc18b OpalInsightField material (no free-field redesign)
    id: "overlap-one",
    metaTitle: "One time",
    signal: "open_loop",
    overlap: oneOverlap,
    priorMessages: ["How was your week?"],
    message: "We really need to hang out this week.",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    // Screen 7: restored 21fc18b multi-option insight field
    id: "overlap-expand",
    metaTitle: "A couple times",
    signal: "open_loop",
    overlap: twoOverlap,
    overlapExpanded: true,
    priorMessages: ["How was your week?"],
    message: "We really need to hang out this week.",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    // Screen 8: restored OpalResolution from 21fc18b
    id: "set",
    metaTitle: "Set",
    signal: "set",
    priorMessages: [
      "How was your week?",
      "We really need to hang out this week.",
    ],
    message: "Thursday after 6:30 works for me — does that work for you?",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "group",
    metaTitle: "Group",
    signal: "open_loop",
    overlap: groupOverlap,
    overlapExpanded: true,
    message: "Saturday dinner still happening?",
    peerName: "Saturday dinner",
    peerSub: "4 people",
  },
  {
    id: "settled",
    metaTitle: "Settled",
    message: "Can't wait — see you Thursday.",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
  {
    id: "quiet-again",
    metaTitle: "Calm",
    message: "How was your week?",
    peerName: "Jordan Lee",
    peerSub: "Friends",
  },
];

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
          <OpalResolution detail="Thursday · after 6:30" />
        </div>
      ) : null}

      <div
        className="thread"
        style={{ flex: 1, minHeight: 220, padding: 12 }}
        data-testid="review-thread"
      >
        {(fixture.priorMessages ?? []).map((body, i) => (
          <div key={`prior-${i}`} className="bubble-row in">
            <div className="bubble in">
              <p>{body}</p>
              <time>Earlier</time>
            </div>
          </div>
        ))}
        <div className="bubble-row in">
          <div className="bubble in">
            <p>{fixture.message}</p>
            <time>Now</time>
          </div>
        </div>

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
        ) : null}
      </div>

      {primary.kind === "private" ? (
        <PrivateGuidance text={primary.text} onDismiss={() => undefined} />
      ) : null}

      {primary.kind === "chip" ? (
        <div
          className={`opal-context-chip-wrap${
            primary.withEdge ? " opal-chip-edge" : ""
          }`}
        >
          <ContextChip label={primary.label} onClick={() => undefined} />
        </div>
      ) : null}

      <form
        className={`composer glass${
          primary.kind === "chip" || primary.kind === "private"
            ? " has-opal-context"
            : ""
        }`}
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
      {/* —— EXTERNAL review chrome only —— */}
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
        {/* Optional external metadata — never inside the phone */}
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

      {/* —— Simulated phone: product only —— */}
      <PhoneSurface primary={primary} fixture={fixture} />
    </div>
  );
}
