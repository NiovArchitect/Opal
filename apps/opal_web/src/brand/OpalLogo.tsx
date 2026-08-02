import React from "react";

type Size = "sm" | "md" | "lg" | "hero";

const sizes: Record<Size, number> = {
  sm: 24,
  md: 30,
  lg: 44,
  hero: 88,
};

/** Futuristic Opal mark — luminous lens with soft signal arcs. */
export function OpalMark({
  size = "md",
  className,
  title = "Opal",
  glow = true,
}: {
  size?: Size;
  className?: string;
  title?: string;
  glow?: boolean;
}) {
  const px = sizes[size];
  const uid = React.useId().replace(/:/g, "");
  return (
    <svg
      className={`opal-mark ${glow ? "opal-mark--glow" : ""} ${className ?? ""}`}
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={title || undefined}
      aria-hidden={title === "" ? true : undefined}
    >
      <defs>
        <radialGradient id={`omCore-${uid}`} cx="36%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F7FCFF" />
          <stop offset="28%" stopColor="#B8F0F8" />
          <stop offset="58%" stopColor="#5ED6E8" />
          <stop offset="82%" stopColor="#3A7A9A" />
          <stop offset="100%" stopColor="#1A3040" />
        </radialGradient>
        <linearGradient id={`omSheen-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8D5C4" stopOpacity="0.5" />
          <stop offset="45%" stopColor="#8B9CFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#5ED6E8" stopOpacity="0.35" />
        </linearGradient>
        <filter id={`omBloom-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="20"
        fill={`url(#omCore-${uid})`}
        filter={glow ? `url(#omBloom-${uid})` : undefined}
      />
      <circle cx="32" cy="32" r="20" fill={`url(#omSheen-${uid})`} />
      <circle
        cx="32"
        cy="32"
        r="20.5"
        stroke="rgba(158, 232, 245, 0.35)"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M18 37c5 8 12.5 11.5 22.5 10"
        stroke="#F7FCFF"
        strokeOpacity="0.65"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M20 27c6.5-8 16-9 25-3.5"
        stroke="#F7FCFF"
        strokeOpacity="0.38"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="40" cy="22" r="3.4" fill="#F7FCFF" fillOpacity="0.95" />
      <circle cx="40" cy="22" r="5.5" fill="#5ED6E8" fillOpacity="0.22" />
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
      {showWord ? <span className="opal-wordmark">Opal</span> : null}
    </div>
  );
}
