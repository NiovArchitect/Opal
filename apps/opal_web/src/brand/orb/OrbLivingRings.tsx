/**
 * Repair #18 - SPLASH 1 REBUILD - THE LIVING RINGS (founder order
 * 2026-10-18 13:48 PDT: "the rings I wish moved in an animated way
 * around the orb").
 *
 * ONE shared system, two intensities:
 *  - variant="hero": composited over the full-bleed master on
 *    Splash 1. The master's baked rings stay the STRUCTURE; this
 *    layer carries only the MOTION - points of light traveling the
 *    two gyroscope rings plus one slow lit arc precessing against
 *    them. It draws no ring strokes of its own, so nothing doubles
 *    or fights the baked art.
 *  - variant="ambient": the same travelers at dock scale over the
 *    OrbMark vector device (Center dock / presence) - fewer points,
 *    dimmer, slower.
 *
 * Geometry is the MEASURED master geometry (orbGeometry.ts, in the
 * shared 200-unit viewBox): circular ring center (101, 100) r 71;
 * horizontal ring center (101, 106) rx 86 ry 11. The layer is
 * rendered into a square host the size of the orb composition it
 * rides on, so the travelers track the rings at any rendered size.
 *
 * Motion: SMIL animateTransform / animateMotion on transform only -
 * no layout, no paint-heavy properties; the layer fades in AFTER
 * first paint (CSS settle, orb.css) so the opening surface paints
 * the still master first and the motion settles in. QUIET law:
 * full revolutions take 44-150s; nothing pulses, nothing loops fast.
 *
 * Reduced motion: when the user prefers reduced motion the layer
 * RESTS - hero renders the measured points of light statically (they
 * coincide with the master's baked points), ambient renders nothing
 * (the OrbMark's own static points remain). No animation elements
 * are emitted at all in that state.
 */
import React, { useEffect, useState } from "react";
import { ORB_HRING, ORB_POINTS, ORB_RING } from "./orbGeometry";
import "./orb.css";

let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `orb-living-${prefix}-${uid}`;
}

function usePrefersReducedMotion(): boolean {
  const read = (): boolean =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [reduced, setReduced] = useState<boolean>(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else if (typeof mq.addListener === "function") mq.addListener(onChange);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onChange);
      else if (typeof mq.removeListener === "function") mq.removeListener(onChange);
    };
  }, []);
  return reduced;
}

/** A point of light: soft halo + the sampled point-light core. */
function TravelPoint({
  haloR,
  coreR,
  glowId,
  opacity = 1,
}: {
  haloR: number;
  coreR: number;
  glowId: string;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      <circle r={haloR} fill={`url(#${glowId})`} />
      <circle r={coreR} fill="var(--orb-point-light)" />
    </g>
  );
}

function ringPoint(angleDeg: number): { cx: number; cy: number } {
  const a = (angleDeg * Math.PI) / 180;
  return {
    cx: Math.round((ORB_RING.cx + ORB_RING.r * Math.cos(a)) * 10) / 10,
    cy: Math.round((ORB_RING.cy + ORB_RING.r * Math.sin(a)) * 10) / 10,
  };
}

/** Ellipse path of the horizontal ring, in viewBox units. */
const HRING_PATH = `M ${ORB_HRING.cx - ORB_HRING.rx} ${ORB_HRING.cy} A ${ORB_HRING.rx} ${ORB_HRING.ry} 0 1 1 ${ORB_HRING.cx + ORB_HRING.rx} ${ORB_HRING.cy} A ${ORB_HRING.rx} ${ORB_HRING.ry} 0 1 1 ${ORB_HRING.cx - ORB_HRING.rx} ${ORB_HRING.cy}`;

/** Lit arc on the circular ring: a 64-degree span of the ring. */
function arcPath(spanDeg: number, startDeg: number): string {
  const p0 = ringPoint(startDeg);
  const p1 = ringPoint(startDeg + spanDeg);
  return `M ${p0.cx} ${p0.cy} A ${ORB_RING.r} ${ORB_RING.r} 0 0 1 ${p1.cx} ${p1.cy}`;
}

export function OrbLivingRings({
  variant = "hero",
  className,
}: {
  variant?: "hero" | "ambient";
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const id = nextId(variant);
  const glowId = `${id}-glow`;
  const hero = variant === "hero";

  // Differential speeds (seconds per revolution) - slow, ambient,
  // never busy (QUIET). The arc precesses AGAINST the travelers.
  const circleDur = hero ? 64 : 96;
  const ellipseDur = hero ? 44 : 72;
  const arcDur = hero ? 120 : 160;

  const circleAngles = hero ? [20, 160, 285] : [30, 210];
  const haloR = hero ? 6 : 5;
  const coreR = hero ? 2 : 1.7;

  return (
    <svg
      className={`orb-living-rings orb-living-rings--${variant} ${className ?? ""}`.trim()}
      viewBox="0 0 200 200"
      aria-hidden
      data-orb-living-rings={variant}
      data-motion={reduced ? "rest" : "living"}
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="var(--orb-point-light)" stopOpacity="0.85" />
          <stop offset="45%" stopColor="var(--orb-fire-gold)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--orb-fire-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {reduced ? (
        /* REST: the measured points of light, static. Ambient rests
         * to nothing - the mark beneath already carries its points. */
        hero ? (
          <g data-living="points-rest">
            {ORB_POINTS.map((p) => (
              <g key={`${p.cx}-${p.cy}`} transform={`translate(${p.cx} ${p.cy})`}>
                <TravelPoint haloR={haloR} coreR={coreR} glowId={glowId} opacity={0.9} />
              </g>
            ))}
          </g>
        ) : null
      ) : (
        <g data-living="motion">
          {/* Precessing lit arc on the circular ring (reverse, slowest). */}
          <g opacity={hero ? 0.4 : 0.22}>
            <path
              d={arcPath(64, -90)}
              fill="none"
              stroke="var(--orb-ring-metal-lit)"
              strokeWidth={hero ? 2.2 : 1.8}
              strokeLinecap="round"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`360 ${ORB_RING.cx} ${ORB_RING.cy}`}
              to={`0 ${ORB_RING.cx} ${ORB_RING.cy}`}
              dur={`${arcDur}s`}
              repeatCount="indefinite"
            />
          </g>

          {/* Travelers on the circular gyroscope ring. */}
          <g>
            {circleAngles.map((a) => {
              const p = ringPoint(a);
              return (
                <g key={a} transform={`translate(${p.cx} ${p.cy})`}>
                  <TravelPoint haloR={haloR} coreR={coreR} glowId={glowId} opacity={hero ? 0.95 : 0.75} />
                </g>
              );
            })}
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${ORB_RING.cx} ${ORB_RING.cy}`}
              to={`360 ${ORB_RING.cx} ${ORB_RING.cy}`}
              dur={`${circleDur}s`}
              repeatCount="indefinite"
            />
          </g>

          {/* Travelers on the horizontal ring (its own faster lap). */}
          {(hero ? [0, -ellipseDur / 2] : [0]).map((begin) => (
            <g key={begin} opacity={hero ? 0.95 : 0.75}>
              <TravelPoint haloR={haloR * 0.85} coreR={coreR * 0.9} glowId={glowId} />
              <animateMotion
                dur={`${ellipseDur}s`}
                begin={`${begin}s`}
                repeatCount="indefinite"
                path={HRING_PATH}
              />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
