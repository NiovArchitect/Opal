/**
 * Repair #18 - Division C2 - shared shell bits: avatar, icons, empty
 * and error blocks (track-c2 sections 3.4, 7.1, 9, 11). Icons are
 * drawn for C2 (stroke glyphs in surface ink); no old asset is reused.
 */
import React, { useState } from "react";
import { OrbMarkSmall } from "../../brand/orb/OrbMark";
import type { AvatarRef } from "./projections";

const TINTS = [
  "var(--person-tint-1)",
  "var(--person-tint-2)",
  "var(--person-tint-3)",
  "var(--person-tint-4)",
  "var(--person-tint-5)",
  "var(--person-tint-6)",
];

export function Avatar({
  avatar,
  size = 36,
  onClick,
  label,
}: {
  avatar: AvatarRef;
  size?: number;
  onClick?: () => void;
  label?: string;
}) {
  const tint =
    avatar.tint != null ? TINTS[(avatar.tint - 1 + TINTS.length) % TINTS.length] : undefined;
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.38),
    background: tint
      ? `color-mix(in srgb, ${tint} 18%, var(--surface-2))`
      : "var(--surface-2)",
  };
  const inner = avatar.photoUrl ? (
    <img src={avatar.photoUrl} alt="" draggable={false} />
  ) : (
    <span aria-hidden>{avatar.initials}</span>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className="c2s-avatar"
        style={style}
        onClick={onClick}
        aria-label={label ?? "Profile"}
        data-testid="c2-avatar"
      >
        {inner}
      </button>
    );
  }
  return (
    <span className="c2s-avatar" style={style} aria-hidden>
      {inner}
    </span>
  );
}

function Glyph({
  d,
  size = 24,
  extra,
}: {
  d: string[];
  size?: number;
  extra?: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {d.map((path) => (
        <path key={path} d={path} />
      ))}
      {extra}
    </svg>
  );
}

export const IconHome = ({ size = 24 }: { size?: number }) => (
  <Glyph size={size} d={["M4 11.5 12 4l8 7.5", "M6.5 10v9h11v-9"]} />
);
/** Flow (founder rename, 2026-10-20): the water glyph for the social
 * surface - stacked wave lines in the same stroke language as the
 * other dock glyphs; the up-down squiggle reads as moving water and
 * replaces the house in this slot. */
export const IconFlow = ({ size = 24 }: { size?: number }) => (
  <Glyph
    size={size}
    d={[
      "M3 9c2-2.5 4-2.5 6 0s4 2.5 6 0s4-2.5 6 0",
      "M3 15.5c2-2.5 4-2.5 6 0s4 2.5 6 0s4-2.5 6 0",
    ]}
  />
);
export const IconChats = ({ size = 24 }: { size?: number }) => (
  <Glyph
    size={size}
    d={["M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z"]}
  />
);
/** Joined-nodes glyph for Graphs, redrawn for C2 (section 9). */
export const IconGraphs = ({ size = 24 }: { size?: number }) => (
  <Glyph
    size={size}
    d={["M7 8.5 16.5 6", "M7 8.5 14 16.5", "M16.5 6 14 16.5"]}
    extra={
      <>
        <circle cx="7" cy="8.5" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="17" cy="5.8" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="14" cy="17" r="2.6" fill="currentColor" stroke="none" />
      </>
    }
  />
);
export const IconSearch = ({ size = 22 }: { size?: number }) => (
  <Glyph size={size} d={["M10.8 5a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6z", "M15.3 15.3 20 20"]} />
);
/** Activity: people plus pulse, redrawn for C2 (section 7.1). */
export const IconActivity = ({ size = 22 }: { size?: number }) => (
  <Glyph
    size={size}
    d={["M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M3.5 19c.6-2.8 2.6-4.2 5-4.2", "M13 15.5h2l1.2-2.6 1.8 4.4 1.2-1.8H21"]}
  />
);
export const IconBack = ({ size = 22 }: { size?: number }) => (
  <Glyph size={size} d={["M14.5 5.5 8 12l6.5 6.5"]} />
);
export const IconClose = ({ size = 22 }: { size?: number }) => (
  <Glyph size={size} d={["M6 6l12 12", "M18 6 6 18"]} />
);
export const IconCamera = ({ size = 22 }: { size?: number }) => (
  <Glyph size={size} d={["M4 8h3l1.8-2.5h6.4L17 8h3v11H4z", "M12 16.2a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z"]} />
);
export const IconImage = ({ size = 22 }: { size?: number }) => (
  <Glyph size={size} d={["M4 5h16v14H4z", "M4 16.5 9.5 11l3.5 3.5L17 10l3 3.5", "M9 9.2a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z"]} />
);
export const IconChevron = ({ size = 18 }: { size?: number }) => (
  <Glyph size={size} d={["M9.5 5.5 16 12l-6.5 6.5"]} />
);
/** Repair #21 charges (CF2-2) - the door glyph: a doorway arch.
 *  The quiet affordance that opens a card's door surface - it
 *  carries no label; the doors themselves are labeled inside
 *  the surface it opens. */
/** Repair #21 (W-17) - the text glyph: ruled lines, the last
 *  one short - words, nothing else. The creation sheet's text
 *  door. */
export const IconText = ({ size = 22 }: { size?: number }) => (
  <Glyph size={size} d={["M4 6.5h16", "M4 12h16", "M4 17.5h9"]} />
);
export const IconDoorway = ({ size = 20 }: { size?: number }) => (
  <Glyph
    size={size}
    d={[
      "M5.5 20.5v-7c0-4.4 2.9-7.5 6.5-7.5s6.5 3.1 6.5 7.5v7",
      "M3 20.5h18",
      "M15.6 14.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    ]}
  />
);
export const IconPerson = ({ size = 24 }: { size?: number }) => (
  <Glyph size={size} d={["M12 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z", "M5 20c.8-3.9 3.6-5.8 7-5.8s6.2 1.9 7 5.8"]} />
);

/**
 * Repair #23 (WS-23-1) - REPOST: two arrows chasing each other
 * in a cycle, the share-onward mark every social reader knows.
 * Drawn in the same stroke language as the other card glyphs;
 * the button carries the state (data-active), this only draws.
 */
export const IconRepost = ({ size = 24 }: { size?: number }) => (
  <Glyph
    size={size}
    d={[
      "M3.5 8h13",
      "M13.5 5l3 3-3 3",
      "M20.5 16H7.5",
      "M10.5 13l-3 3 3 3",
    ]}
  />
);

/**
 * Repair #23 (WS-23-1) - SAVE: a bookmark ribbon. At rest it is
 * the outline; saved, the button's data-active state fills it
 * (see c2shell.css) - the shape never changes, the fill is the
 * state, so the card reads the same in both modes.
 */
export const IconSave = ({ size = 24 }: { size?: number }) => (
  <Glyph
    size={size}
    d={["M6.5 4h11v16l-5.5-3.8L6.5 20z"]}
    extra={<path className="c2s-save-fill" d="M6.5 4h11v16l-5.5-3.8L6.5 20z" stroke="none" />}
  />
);

/**
 * Repair #21 round 3 (F-D + W-19 slice) - THE LIGHT HEART.
 * Light is a glyph now, never a word: a heart whose body is
 * the brand's marbled fire (the orb palette - point light,
 * gold, magenta, violet, cyan - the same material the founder
 * praised on the thread's orbit button), ringed by one fine
 * orbit ring with a single point of light riding it. At rest
 * the marble sits at a glisten; lit, it comes fully up and
 * holds the tier's glow; held (the deepening press), it
 * gathers - scale and glow rise together while the finger is
 * down. States ride data attributes on the wrapping button
 * (c2s-heart-btn); this component only draws.
 */
export function HeartGlyph({ size = 30 }: { size?: number }) {
  const raw = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `opalHeart${raw}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      aria-hidden
      className="c2s-heart-art"
    >
      <defs>
        <radialGradient id={gradId} cx="38%" cy="30%" r="85%">
          <stop offset="0%" style={{ stopColor: "var(--orb-point-light)" }} />
          <stop offset="34%" style={{ stopColor: "var(--orb-fire-gold)" }} />
          <stop offset="58%" style={{ stopColor: "var(--orb-fire-magenta)" }} />
          <stop offset="82%" style={{ stopColor: "var(--orb-fire-violet)" }} />
          <stop offset="100%" style={{ stopColor: "var(--orb-fire-cyan)" }} />
        </radialGradient>
      </defs>
      <circle
        cx="15"
        cy="15"
        r="13.6"
        className="c2s-heart-orbit"
        strokeWidth="1"
      />
      <circle cx="24.6" cy="8.2" r="1.7" className="c2s-heart-orbit-dot" />
      <path
        className="c2s-heart-fill"
        fill={`url(#${gradId})`}
        d="M15 24.6C9.9 21.2 6.4 17.9 6.4 13.9c0-2.9 2.1-5 4.7-5 1.7 0 3.2.9 3.9 2.2.7-1.3 2.2-2.2 3.9-2.2 2.6 0 4.7 2.1 4.7 5 0 4-3.5 7.3-8.6 10.7z"
      />
      <path
        className="c2s-heart-line"
        d="M15 24.6C9.9 21.2 6.4 17.9 6.4 13.9c0-2.9 2.1-5 4.7-5 1.7 0 3.2.9 3.9 2.2.7-1.3 2.2-2.2 3.9-2.2 2.6 0 4.7 2.1 4.7 5 0 4-3.5 7.3-8.6 10.7z"
      />
    </svg>
  );
}

/**
 * Repair #21 round 3 (F-F) - GRAPH IN: the card's door glyph,
 * drawn as THE GRAPH ITSELF - an anchor stone with its people
 * as nodes on connecting lines, in the forming state color
 * (the button carries the color). It is the thing it opens,
 * not an abstraction of a door. (The CF2-2 doorway glyph
 * died under F-E/F-F: illegible at rendered size - it read as
 * a bell, a dome, an igloo. IconDoorway remains exported only
 * because nothing may break an import; it renders nowhere in
 * the flows scope.)
 */
export const IconGraphIn = ({ size = 24 }: { size?: number }) => (
  <Glyph
    size={size}
    d={["M12 12.5 5.8 6.8", "M12 12.5 18.4 6.2", "M12 12.5 16 18.6"]}
    extra={
      <>
        <circle cx="12" cy="12.5" r="3.6" fill="currentColor" stroke="none" />
        <circle cx="5.4" cy="6.4" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="18.8" cy="5.8" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="16.4" cy="19" r="2.2" fill="currentColor" stroke="none" />
      </>
    }
  />
);

/** Round 3 (F-F) - the take-panel branch glyphs. The party
 *  composition is DRAWN, never described: heads and shoulders
 *  in the panel's tile, captions at most two words beneath. */
export const IconBranchJoin = ({ size = 26 }: { size?: number }) => (
  <Glyph
    size={size}
    d={[
      "M8.2 10.6a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4z",
      "M3.4 19.4c.6-3 2.4-4.5 4.8-4.5 1.5 0 2.8.6 3.7 1.7",
      "M16.4 12.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z",
      "M14.9 15.4c2.3.2 3.9 1.6 4.4 4",
      "M19.6 3.4v4M17.6 5.4h4",
    ]}
  />
);
export const IconBranchSolo = ({ size = 26 }: { size?: number }) => (
  <Glyph
    size={size}
    d={[
      "M12 10.4a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z",
      "M7.1 17.6c.7-2.9 2.6-4.3 4.9-4.3s4.2 1.4 4.9 4.3",
    ]}
    extra={<circle cx="12" cy="12" r="9.6" strokeWidth="1.1" opacity="0.65" />}
  />
);
export const IconBranchPeople = ({ size = 26 }: { size?: number }) => (
  <Glyph
    size={size}
    d={[
      "M7.4 10.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
      "M3 18.6c.5-2.8 2.2-4.2 4.4-4.2 1 0 1.9.3 2.6.9",
      "M12.6 11.4a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4z",
      "M8.3 19.4c.6-3.1 2.3-4.7 4.3-4.7s3.7 1.6 4.3 4.7",
      "M17.6 10.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
      "M16.6 15.3c.7-.6 1.6-.9 2.6-.9 2.2 0 3.9 1.4 4.4 4.2",
    ]}
  />
);
export const IconBranchAgain = ({ size = 26 }: { size?: number }) => (
  <Glyph
    size={size}
    d={["M19.4 8.2A8 8 0 1 0 20.4 13", "M20.6 4.2v4.4h-4.4"]}
    extra={<circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />}
  />
);

/**
 * Repair #21 (W-3) - the (i) bubble: the ONLY place explanation
 * copy lives on a surface. A tiny italic i in a small circle;
 * tapping it reveals the explanation underneath. Surfaces render
 * the quiet state alone; anything that merely instructs is passed
 * here instead of being plastered on the surface. Shared with the
 * C1 surfaces (C1Surfaces imports this same component) and offered
 * to the Orbit room (muse/r21-orbit) as-is: markup + the calm-info
 * classes in c2shell.css.
 */
export function InfoBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="calm-info-wrap">
      <button
        type="button"
        className="calm-info"
        data-testid="calm-info"
        aria-expanded={open}
        aria-label="More about this"
        onClick={() => setOpen((v) => !v)}
      >
        <em aria-hidden>i</em>
      </button>
      {open ? (
        <span className="calm-info-pop" data-testid="calm-info-pop" role="note">
          {text}
        </span>
      ) : null}
    </span>
  );
}

export function EmptyBlock({
  headline,
  line,
  actionLabel,
  onAction,
  testId,
  lineVisible = false,
}: {
  headline: string;
  line: string;
  actionLabel?: string;
  onAction?: () => void;
  testId?: string;
  /**
   * R21 W-3: by default the explanatory line moves behind the (i)
   * bubble (quiet state + bubble). A caller whose line is live
   * content - an error's own words, not an explanation - passes
   * lineVisible and the line stays on the surface.
   */
  lineVisible?: boolean;
}) {
  return (
    <div className="c2s-empty" data-testid={testId}>
      <span style={{ color: "var(--ink-3)", display: "inline-flex" }}>
        <OrbMarkSmall size={40} />
      </span>
      <h2>{headline}</h2>
      {lineVisible ? <p>{line}</p> : line ? <InfoBubble text={line} /> : null}
      {actionLabel && onAction ? (
        <button type="button" className="c2s-btn-quiet" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
