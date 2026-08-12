import React from "react";

type Size = "sm" | "md" | "lg" | "hero";

const sizes: Record<Size, number> = {
  sm: 24,
  md: 30,
  lg: 44,
  hero: 88,
};

/**
 * Working brand mark (not final lock).
 * Clean opalescent O / loop - no halo, no crude zero slash, no network nodes.
 * Visual reference: Figma node 63:7 brand assets.
 */
export function OpalMark({
  size = "md",
  className,
  title = "Opal",
  glow = false,
}: {
  size?: Size;
  className?: string;
  title?: string;
  /** Ignored - product law: no permanent logo halo. */
  glow?: boolean;
}) {
  void glow;
  const px = sizes[size];
  const uid = React.useId().replace(/:/g, "");
  return (
    <svg
      className={`opal-mark ${className ?? ""}`}
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={title || undefined}
      aria-hidden={title === "" ? true : undefined}
    >
      <defs>
        <radialGradient id={`omCore-${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#F4F7FA" />
          <stop offset="32%" stopColor="#B8F0F8" />
          <stop offset="62%" stopColor="#6EE7F5" />
          <stop offset="88%" stopColor="#5B4FBF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0A0E16" />
        </radialGradient>
        <linearGradient id={`omRing-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B7CFF" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#6EE7F5" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#E8D5C4" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* Soft void disc - living void base */}
      <circle cx="32" cy="32" r="22" fill="#030508" />
      {/* Opalescent core - working material direction */}
      <circle cx="32" cy="32" r="15" fill={`url(#omCore-${uid})`} />
      {/* Open loop ring - origin / convergence without diagram */}
      <circle
        cx="32"
        cy="32"
        r="18.5"
        stroke={`url(#omRing-${uid})`}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="92 24"
        strokeDashoffset="8"
      />
      {/* Inner spectral fleck - restrained, no halo */}
      <circle cx="38" cy="24" r="2.2" fill="#F4F7FA" fillOpacity="0.9" />
    </svg>
  );
}

/** Mark + wordmark lockup for headers. */
export function OpalLockup({
  size = "md",
  showWord = true,
}: {
  size?: Size;
  showWord?: boolean;
}) {
  return (
    <div className="opal-lockup" aria-label="Opal">
      <OpalMark size={size} title="" />
      {showWord ? <span className="opal-wordmark">OPAL</span> : null}
    </div>
  );
}
