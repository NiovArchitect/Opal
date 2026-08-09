/**
 * Founder visual progression review (mobile-width).
 * ?review=availability or #/review/availability
 *
 * A quiet → B Edge → C Find-a-time → D private → E selection
 * → F shared overlap → G expanded → H still open vibe → I Set
 * → J group → K reduced-motion note
 */
import React, { useState } from "react";
import {
  semanticStateForSignal,
  visualShellProps,
} from "../theme/technicolorProduction";
import { contextChipLabel, privateGuidanceCopy } from "../opalUi/grammar";
import { ContextChip } from "../opalUi/ContextChip";
import { PrivateGuidance } from "../opalUi/PrivateGuidance";

type Scene = {
  id: string;
  letter: string;
  title: string;
  signal?: string;
  signalLabel?: string;
  edge?: boolean;
  chip?: string | null;
  privateText?: string | null;
  overlapLabel?: string | null;
  detail?: string | null;
  expand?: boolean;
  set?: boolean;
  note?: string;
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
    signalLabel: "Still figuring this one out",
    privateText: "Share a couple times that work when you're ready.",
    note: "Dominant violet = only you. Never shared thread payload.",
  },
  {
    id: "select",
    letter: "E",
    title: "Private selection (sheet)",
    signal: "open_loop",
    signalLabel: "Still figuring this one out",
    note: "Sheet: When could you meet? Only you can see this list.",
  },
  {
    id: "overlap",
    letter: "F",
    title: "Shared overlap",
    signal: "open_loop",
    signalLabel: "This could work",
    edge: true,
    chip: "See that time",
    overlapLabel: "One time works for both of you.",
    detail: "Thursday, 6:30–9:00 PM",
    note: "Recognition spectrum — not Set emerald.",
  },
  {
    id: "expand",
    letter: "G",
    title: "Expanded moment",
    signal: "open_loop",
    signalLabel: "A couple options fit",
    edge: true,
    chip: "2 times could work",
    overlapLabel: "2 times work for both of you.",
    detail: "See all 2 times",
    expand: true,
    note: "Temporary reveal. Collapses after choice.",
  },
  {
    id: "still",
    letter: "H",
    title: "Still open (vibe copy)",
    signal: "open_loop",
    signalLabel: "Still figuring this one out",
    note: "Canonical still_open; vibe copy may vary. No 'waiting on Maya'.",
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
    signal: "plan_forming",
    signalLabel: "Becoming a plan",
    edge: true,
    chip: "Find a time",
    overlapLabel: "2 times work for both of you.",
    detail: "Based on times people shared — count only, never a roster.",
    note: "Same grammar. No romance hard-code.",
  },
  {
    id: "reduced",
    letter: "K",
    title: "Reduced motion",
    signal: "open_loop",
    signalLabel: "This could work",
    edge: true,
    overlapLabel: "One time works for both of you.",
    detail: "Thursday, 6:30–9:00 PM",
    note: "Meaning from color + label without animation.",
  },
];

export function AvailabilityReview() {
  const [sceneId, setSceneId] = useState(SCENES[0].id);
  const [privateDismissed, setPrivateDismissed] = useState(false);
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const shell = visualShellProps("member");

  const chip =
    scene.chip ??
    contextChipLabel({
      signalKind: scene.signal as "plan_forming" | "open_loop" | undefined,
      overlap:
        scene.overlapLabel && scene.overlapLabel.includes("2 times")
          ? {
              label: scene.overlapLabel,
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
            }
          : scene.overlapLabel
            ? {
                label: scene.overlapLabel,
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
              }
            : null,
    });

  const guidance =
    scene.privateText && !privateDismissed
      ? { text: scene.privateText }
      : privateGuidanceCopy({
          overlap: scene.privateText
            ? { overlap_status: "need_more_shares", label: "", overlaps: [], no_private_schedule: true }
            : null,
        });

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
              {scene.id === "group" ? "Maya, Chris, Jordan, Priya" : "Friends"}
            </div>
          </div>
        </header>

        {scene.signalLabel ? (
          <div
            className={`opal-moment journey signal-${scene.signal}${
              scene.edge ? " opal-edge" : ""
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

          {scene.overlapLabel ? (
            <div
              className={`opal-moment inline moment-enter signal-availability_overlap${
                scene.detail ? " has-detail" : ""
              }`}
              role="status"
              data-state={semanticStateForSignal("availability_overlap")}
              data-testid="review-overlap"
            >
              <span className="opal-moment-mark" aria-hidden>
                ◈
              </span>
              <span className="opal-moment-label">{scene.overlapLabel}</span>
              {scene.detail ? (
                <span className="opal-moment-detail">{scene.detail}</span>
              ) : null}
            </div>
          ) : null}

          {scene.expand ? (
            <div className="opal-moment-expand" data-testid="review-expand">
              <button type="button" className="btn ghost">
                Thursday, 6:30–9:00 PM
              </button>
              <button type="button" className="btn ghost">
                Sunday afternoon
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

        {guidance && scene.privateText ? (
          <PrivateGuidance
            text={guidance.text}
            onDismiss={() => setPrivateDismissed(true)}
          />
        ) : null}

        {chip && !scene.set ? (
          <div className="opal-context-chip-wrap">
            <ContextChip label={chip} onClick={() => undefined} />
          </div>
        ) : null}

        <form className="composer glass" onSubmit={(e) => e.preventDefault()}>
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
