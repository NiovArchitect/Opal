/**
 * Repair #18 - THE ORB SYSTEM - the anchor mark and its reductions.
 *
 * THE ORB MARK IS THE ANCHOR (founder, 2026-10-18 06:03 PDT): the
 * app rises to the mark. Asset-per-job law (section 8.1):
 *  - HERO sizes carry THE MASTER ITSELF (OrbHero renders the
 *    luminosity-keyed master asset; light mode renders the
 *    medallion VARIANT of the same master - never an inversion,
 *    never a hand-drawn substitute).
 *  - SMALL sizes + chrome carry VECTOR REDUCTIONS derived from the
 *    measured master geometry (orbGeometry.ts): the ring device,
 *    the gem O, the OPAL wordmark. Reductions are simplifications,
 *    declared as such - style-identical family, not pixel copies.
 *  - FLAT single-color fallbacks exist for every reduction.
 *  - The shell's interim mark (C2Mark / the DIR-5 family) is RETIRED
 *    (founder, 2026-10-18 12:53 PDT): the orb is the logo, permanently.
 *    It is not an alternate, not a fallback identity inside this
 *    design, and no surface in the integrated build renders it.
 *  - LOCKUP LAW (founder, 2026-10-18 12:54 PDT): the ONLY combined
 *    composition of mark + wordmark is the STACKED lockup - orb
 *    centered ABOVE the wordmark, one vertical unit. Horizontal
 *    side-by-side placement is banned everywhere. Elsewhere the norm
 *    is ONE element at a time: the orb alone, or the wordmark alone.
 *
 * Mode: components never branch on mode for the vector forms (they
 * read tokens). OrbHero DOES choose its asset per mode - hero art is
 * the one place the law demands a variant, and the choice is made
 * from the same data-mode attribute the token system reads, via CSS
 * (both assets in the DOM would double-download; instead the
 * component reads the attribute once at render - the shell stamps
 * data-mode before first paint and remounts surfaces on mode
 * change through c2Mode's listener at the shell root).
 */
import React, { useEffect, useState } from "react";
import {
  GEM_O_FACETS,
  ORB_HRING,
  ORB_POINTS,
  ORB_RING,
  ORB_SPHERE,
  ORB_VIEWBOX,
  WM_PATHS,
  WM_STROKE,
  WM_VIEWBOX,
} from "./orbGeometry";
import { ORB_ASSETS } from "./orbTokens";
import "./orb.css";

function useDataMode(): "light" | "dark" {
  const read = (): "light" | "dark" =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-mode") === "dark"
      ? "dark"
      : "light";
  const [mode, setMode] = useState<"light" | "dark">(read);
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const obs = new MutationObserver(() => setMode(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });
    return () => obs.disconnect();
  }, []);
  return mode;
}

let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `orb-${prefix}-${uid}`;
}

/**
 * HERO - the master itself. Dark: the keyed master on the page's own
 * deep field (no background box - a box FAILS, section 8). Light:
 * the medallion variant (jewel-in-case). Large sizes only; callers
 * pass the rendered pixel size for the asset choice (512 vs 1024).
 */
export function OrbHero({
  size = 280,
  title = "Opal",
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  const mode = useDataMode();
  const medallion = mode === "light";
  const src = medallion
    ? ORB_ASSETS.medallion
    : size <= 512
      ? ORB_ASSETS.hero512
      : ORB_ASSETS.hero;
  return (
    <img
      className={`orb-hero ${medallion ? "orb-hero--medallion" : ""} ${className ?? ""}`.trim()}
      src={src}
      width={size}
      height={size}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      data-orb-asset={medallion ? "hero-medallion" : "hero-master"}
      data-orb-master="1"
      draggable={false}
    />
  );
}

/** Shared fire fill definition for the reductions (sampled peaks). */
function FireDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-fire`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--orb-fire-violet)" />
        <stop offset="34%" stopColor="var(--orb-fire-blue)" />
        <stop offset="58%" stopColor="var(--orb-fire-cyan)" />
        <stop offset="80%" stopColor="var(--orb-fire-magenta)" />
        <stop offset="100%" stopColor="var(--orb-fire-gold)" />
      </linearGradient>
      <radialGradient id={`${id}-core`} cx="0.62" cy="0.6" r="0.75">
        <stop offset="0%" stopColor="var(--orb-fire-gold-core)" />
        <stop offset="45%" stopColor="var(--orb-fire-gold)" stopOpacity="0.35" />
        <stop offset="100%" stopColor="var(--orb-fire-gold)" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--orb-ring-metal)" />
        <stop offset="52%" stopColor="var(--orb-ring-metal-lit)" />
        <stop offset="100%" stopColor="var(--orb-ring-metal)" />
      </linearGradient>
      <filter id={`${id}-soft`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <clipPath id={`${id}-sphere-clip`}>
        <circle cx={ORB_SPHERE.cx} cy={ORB_SPHERE.cy} r={ORB_SPHERE.r} />
      </clipPath>
    </defs>
  );
}

/**
 * The fire inside the stone, reduced: blurred sampled-peak blobs in
 * the master's arrangement (violet lower-left mass, cyan upper-right
 * sweep, magenta + gold accents) clipped to the sphere.
 */
function FireBlobs({ id }: { id: string }) {
  return (
    <g clipPath={`url(#${id}-sphere-clip)`} filter={`url(#${id}-soft)`}>
      <ellipse cx={74} cy={134} rx={34} ry={24} fill="var(--orb-fire-violet)" opacity={0.75} />
      <ellipse cx={128} cy={66} rx={32} ry={20} fill="var(--orb-fire-cyan)" opacity={0.65} />
      <ellipse cx={142} cy={122} rx={18} ry={26} fill="var(--orb-fire-magenta)" opacity={0.5} />
      <ellipse cx={122} cy={138} rx={26} ry={16} fill="var(--orb-fire-gold)" opacity={0.65} />
    </g>
  );
}

/**
 * The ring device at chrome sizes (>= 24px): sphere of fire, the two
 * gyroscope rings in sampled metal, points of light. Derived from
 * the measured geometry; the dock's center device.
 */
export function OrbMark({
  size = 40,
  title = "",
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  const id = nextId("mark");
  if (size < 24) return <OrbMarkSmall size={size} title={title} className={className} />;
  return (
    <svg
      className={`orb-mark ${className ?? ""}`.trim()}
      viewBox={ORB_VIEWBOX}
      width={size}
      height={size}
      role={title === "" ? "presentation" : "img"}
      aria-label={title === "" ? undefined : title}
      aria-hidden={title === "" ? true : undefined}
      data-orb-asset="mark"
    >
      <FireDefs id={id} />
      <ellipse
        cx={ORB_HRING.cx}
        cy={ORB_HRING.cy}
        rx={ORB_HRING.rx}
        ry={ORB_HRING.ry}
        fill="none"
        stroke={`url(#${id}-metal)`}
        strokeWidth={2.4}
      />
      <circle cx={ORB_SPHERE.cx} cy={ORB_SPHERE.cy} r={ORB_SPHERE.r} fill={`url(#${id}-fire)`} />
      <FireBlobs id={id} />
      <circle cx={ORB_SPHERE.cx} cy={ORB_SPHERE.cy} r={ORB_SPHERE.r} fill={`url(#${id}-core)`} />
      <ellipse cx={84} cy={72} rx={26} ry={15} fill="#ffffff" opacity={0.1} />
      <circle
        cx={ORB_RING.cx}
        cy={ORB_RING.cy}
        r={ORB_RING.r}
        fill="none"
        stroke={`url(#${id}-metal)`}
        strokeWidth={2.4}
      />
      {ORB_POINTS.map((p) => (
        <circle key={`${p.cx}-${p.cy}`} cx={p.cx} cy={p.cy} r={2.6} fill="var(--orb-point-light)" />
      ))}
    </svg>
  );
}

/**
 * Small-size reduction (< 24px, dock floor): rings + stone only,
 * heavier strokes, no points - legible where the full device is not.
 */
export function OrbMarkSmall({
  size = 20,
  title = "",
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  const id = nextId("small");
  return (
    <svg
      className={`orb-mark orb-mark--small ${className ?? ""}`.trim()}
      viewBox={ORB_VIEWBOX}
      width={size}
      height={size}
      role={title === "" ? "presentation" : "img"}
      aria-label={title === "" ? undefined : title}
      aria-hidden={title === "" ? true : undefined}
      data-orb-asset="mark-small"
    >
      <FireDefs id={id} />
      <circle cx={ORB_SPHERE.cx} cy={ORB_SPHERE.cy} r={ORB_SPHERE.r} fill={`url(#${id}-fire)`} />
      <circle
        cx={ORB_RING.cx}
        cy={ORB_RING.cy}
        r={ORB_RING.r}
        fill="none"
        stroke={`url(#${id}-metal)`}
        strokeWidth={6}
      />
      <ellipse
        cx={ORB_HRING.cx}
        cy={ORB_HRING.cy}
        rx={ORB_HRING.rx}
        ry={ORB_HRING.ry}
        fill="none"
        stroke={`url(#${id}-metal)`}
        strokeWidth={6}
      />
    </svg>
  );
}

/** Flat single-color fallback: the ring device in currentColor only. */
export function OrbMarkMono({
  size = 24,
  title = "",
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      className={`orb-mark orb-mark--mono ${className ?? ""}`.trim()}
      viewBox={ORB_VIEWBOX}
      width={size}
      height={size}
      role={title === "" ? "presentation" : "img"}
      aria-label={title === "" ? undefined : title}
      aria-hidden={title === "" ? true : undefined}
      data-orb-asset="mark-mono"
    >
      <g fill="none" stroke="currentColor" strokeWidth={7}>
        <circle cx={ORB_SPHERE.cx} cy={ORB_SPHERE.cy} r={ORB_SPHERE.r - 4} />
        <circle cx={ORB_RING.cx} cy={ORB_RING.cy} r={ORB_RING.r} />
        <ellipse cx={ORB_HRING.cx} cy={ORB_HRING.cy} rx={ORB_HRING.rx} ry={ORB_HRING.ry + 4} />
      </g>
    </svg>
  );
}

/** The gem O alone - the wordmark's faceted stone, as a device. */
export function OrbGemO({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`orb-gem-o ${className ?? ""}`.trim()}
      viewBox="0 0 374 372"
      width={size}
      height={Math.round(size * (372 / 374))}
      role="presentation"
      aria-hidden
      data-orb-asset="gem-o"
    >
      {GEM_O_FACETS.map((f) => (
        <polygon key={f.points} points={f.points} fill={f.fill} />
      ))}
    </svg>
  );
}

/**
 * The OPAL wordmark reduction: gem O (faceted, sampled facet colors)
 * + P A L in the sampled wordmark gradient. Geometry is the master's
 * measured letter runs. variant="mono" renders flat currentColor.
 * This is a REDUCTION of the drawn wordmark (uppercase, wide, calm -
 * the typographic voice of section 8 point 5), not the C2 Join
 * wordmark; that lowercase form remains in C2Wordmark as body/chrome
 * history, and the founder's drawn OPAL is the brand wordmark.
 */
export function OrbWordmark({
  width = 132,
  variant = "gradient",
  className,
}: {
  width?: number;
  variant?: "gradient" | "mono";
  className?: string;
}) {
  const id = nextId("wm");
  const height = Math.round(width * (372 / 1530));
  const paint = variant === "mono" ? "currentColor" : `url(#${id}-grad)`;
  return (
    <svg
      className={`orb-wordmark ${className ?? ""}`.trim()}
      viewBox={WM_VIEWBOX}
      width={width}
      height={height}
      role="img"
      aria-label="OPAL"
      data-orb-asset="wordmark"
      data-orb-variant={variant}
    >
      <title>OPAL</title>
      {variant === "gradient" ? (
        <defs>
          <linearGradient id={`${id}-grad`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1530" y2="0">
            <stop offset="0%" stopColor="#9168cb" />
            <stop offset="14.3%" stopColor="#9ba8da" />
            <stop offset="28.6%" stopColor="#897be7" />
            <stop offset="42.9%" stopColor="#7387da" />
            <stop offset="57.1%" stopColor="#6294ce" />
            <stop offset="71.4%" stopColor="#c2a4a9" />
            <stop offset="85.7%" stopColor="#c3c3b7" />
            <stop offset="100%" stopColor="#dcad82" />
          </linearGradient>
        </defs>
      ) : null}
      {variant === "gradient" ? (
        <g>
          {GEM_O_FACETS.map((f) => (
            <polygon key={f.points} points={f.points} fill={f.fill} />
          ))}
        </g>
      ) : (
        <circle
          cx={187}
          cy={186}
          r={(187 + 144) / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={WM_STROKE}
        />
      )}
      <g fill="none" stroke={paint} strokeWidth={WM_STROKE} strokeLinecap="square">
        <path d={WM_PATHS.p} />
        <path d={WM_PATHS.a} />
        <path d={WM_PATHS.l} />
      </g>
    </svg>
  );
}

/** Lockups (LOCKUP LAW, founder 2026-10-18 12:54 PDT): "full" is the
 * STACKED composition only - orb centered above the wordmark, one
 * vertical unit (the splash/opening composition). There is no
 * horizontal variant. Headers carry ONE element: form="wordmark"
 * (the wordmark alone, where the brand name appears). */
export function OrbLockup({
  form = "stacked",
  wordmarkWidth = 96,
  className,
}: {
  /** stacked = orb above wordmark (the only combined form); wordmark = wordmark alone. */
  form?: "stacked" | "full" | "wordmark";
  wordmarkWidth?: number;
  className?: string;
}) {
  if (form === "wordmark") {
    return (
      <span className={`orb-lockup ${className ?? ""}`.trim()} data-orb-lockup="wordmark" role="img" aria-label="OPAL">
        <OrbWordmark width={wordmarkWidth} />
      </span>
    );
  }
  const markSize = Math.round(wordmarkWidth * 0.9);
  return (
    <span
      className={`orb-lockup orb-lockup--stacked ${className ?? ""}`.trim()}
      data-orb-lockup="stacked"
      role="img"
      aria-label="OPAL"
    >
      <OrbMark size={Math.max(markSize, 24)} />
      <OrbWordmark width={wordmarkWidth} />
    </span>
  );
}

/**
 * The faceted-gem pattern asset: the gem O's facet geometry tiled
 * at low opacity (token-driven), for hero/empty zones only - a
 * secondary indicator under QUIET (patterns never carry state).
 */
export function OrbGemPattern({ className }: { className?: string }) {
  const id = nextId("gem");
  return (
    <svg
      className={`orb-gem-pattern ${className ?? ""}`.trim()}
      aria-hidden
      data-orb-asset="gem-pattern"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={`${id}-tile`} width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <g fill="none" stroke="var(--orb-fire-violet)" strokeWidth="1">
            <polygon points="36,6 66,36 36,66 6,36" />
            <polygon points="36,6 36,36 66,36" />
            <polygon points="36,36 36,66 6,36" />
            <circle cx="36" cy="36" r="13" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id}-tile)`} />
    </svg>
  );
}
