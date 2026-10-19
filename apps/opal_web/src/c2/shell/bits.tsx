/**
 * Repair #18 - Division C2 - shared shell bits: avatar, icons, empty
 * and error blocks (track-c2 sections 3.4, 7.1, 9, 11). Icons are
 * drawn for C2 (stroke glyphs in surface ink); no old asset is reused.
 */
import React from "react";
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
export const IconPerson = ({ size = 24 }: { size?: number }) => (
  <Glyph size={size} d={["M12 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z", "M5 20c.8-3.9 3.6-5.8 7-5.8s6.2 1.9 7 5.8"]} />
);

export function EmptyBlock({
  headline,
  line,
  actionLabel,
  onAction,
  testId,
}: {
  headline: string;
  line: string;
  actionLabel?: string;
  onAction?: () => void;
  testId?: string;
}) {
  return (
    <div className="c2s-empty" data-testid={testId}>
<span style={{ color: "var(--ink-3)", display: "inline-flex" }}>
        <OrbMarkSmall size={40} />
      </span>
      <h2>{headline}</h2>
      <p>{line}</p>
      {actionLabel && onAction ? (
        <button type="button" className="c2s-btn-quiet" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
