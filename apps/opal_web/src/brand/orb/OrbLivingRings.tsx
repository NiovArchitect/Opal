/**
 * Repair #19 - SPLASH ANIMATION v2 - THE LIVING RINGS, REBUILT
 * (founder review of the R18 motion proof, 2026-10-18 22:47 PDT:
 * "It just didn't feel long enough and it was a bit jagged when
 * you press play. The dots were rotating - it wasn't the actual
 * halo itself with the dots attached to the halo, moving. The
 * rings will rotate, but also the dots would rotate along the
 * rings that surround the orb. Those dots should never leave the
 * halo or rings. And then it should stop and look the way it
 * does now.")
 *
 * WHAT WAS WRONG IN v1 (root causes, see repair19 splash report):
 *  1. SMIL (animateTransform / animateMotion) is evaluated on the
 *     main thread, never composited - under the opening surface's
 *     load (and under capture) frames land irregularly: jagged.
 *  2. SMIL's timeline starts at document load, not at first
 *     paint, so by the time the layer faded in the travelers were
 *     already mid-lap at an arbitrary phase - and the indefinite
 *     44-120s laps showed only a few seconds of creep in the
 *     proof: too short, and it NEVER settled.
 *  3. The travelers were not the ring's own points: the living
 *     circle travelers sat at 20/160/285 degrees while the rest
 *     composition's points sit at -90/-45/90/135, and the ellipse
 *     travelers were driven by an independent animateMotion -
 *     dots rotating on their own, not dots carried by their
 *     rings.
 *
 * V2 DESIGN - points RIDE their rings, by construction:
 *  - The traveler set IS the rest set (ORB_POINTS). Every point
 *    of light belongs to exactly one ring: its position is a pure
 *    function of that ring's rotation angle and nothing else, so
 *    it is structurally incapable of leaving its ring.
 *  - CIRCULAR RING: the points are children of a ROTOR group.
 *    The rotor's CSS rotation (compositor-driven transform, the
 *    ring center as transform-origin) IS the ring's angle; each
 *    point's effective angle is base-angle + rotor-angle by DOM
 *    construction. Hero: the rotor eases -60deg -> 0deg over the
 *    living phase and stops - 0deg is the rest orientation, so
 *    the settled frame is the rest composition exactly.
 *  - HORIZONTAL RING: a gyroscope ring seen in projection - its
 *    points travel the measured ellipse. Each point rides CSS
 *    keyframes SAMPLED FROM THE PARAMETRIC EQUATION
 *    (cx + rx*cos(phi), cy + ry*sin(phi)) with phi a function of
 *    the ring's travel alone (the committed keyframes in orb.css
 *    are generated from buildEllipseTravelKeyframes' law and
 *    pinned to it by test - every sample lies on the ellipse,
 *    the final sample is the rest point exactly). Pure CSS like
 *    the rotors: compositor-interpolated transforms, no JS clock,
 *    no per-frame JS, no layout, no SMIL. Hero: the two endpoint
 *    points travel -180deg of phi (they exchange ends) and land
 *    on the rest endpoints.
 *  - PRECESSING ARC: rides the circular ring on its own rotor,
 *    counter-rotating (+55deg -> 0deg, against the circle
 *    rotor's -60deg -> 0deg), fading out across the last part of
 *    the phase - the rest composition carries no live arc, so
 *    the settled frame has none.
 *  - SETTLE (hero): after delay + duration (15.45s) the
 *    component renders the REST branch - the same code path as
 *    reduced motion. Final frame == the still splash by
 *    construction, not by approximation. The still master
 *    paints first (existing 0.45s beat + 1.6s fade, unchanged);
 *    every v2 clock is delayed by the same 0.45s beat so the
 *    motion starts WITH the fade, never before it.
 *  - AMBIENT (dock): the same riding structure, indefinite at
 *    v1's laps (circle 96s, ellipse 72s, arc 160s reverse) - the
 *    dock's job is presence, so it does not settle; the splash's
 *    job is an opening, so it does.
 *  - PERFORMANCE: GPU transforms only; will-change: transform
 *    on the rotor groups and riders only (plus the layer's
 *    existing opacity); the whole system pauses when the
 *    document is hidden or the layer is off-screen (CSS
 *    animation-play-state via data-paused).
 *  - REDUCED MOTION: unchanged law - rests immediately, no
 *    animation of any kind; hero shows the measured points
 *    statically, ambient renders nothing.
 *
 * Geometry is the MEASURED master geometry (orbGeometry.ts, in
 * the shared 200-unit viewBox): circular ring center (101, 100)
 * r 71; horizontal ring center (101, 106) rx 86 ry 11. The layer
 * draws no ring strokes of its own - the baked master (hero) /
 * vector mark (ambient) stays the only structure.
 */
import React, { useEffect, useRef, useState } from "react";
import { ORB_HRING, ORB_POINTS, ORB_RING } from "./orbGeometry";
import type { OrbIndicatorState } from "./orbTokens";
import { isOrbIndicatorState } from "./FireLine";
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

/* ------------------------------------------------------------------ */
/* The motion law, as data (tests pin these values).                   */
/* ------------------------------------------------------------------ */

/** The fade-in beat: every v2 clock starts when the layer does. */
export const ORB_LIVING_DELAY_MS = 450;
/** Hero living-phase travel time (the settle follows it). */
export const ORB_HERO_DURATION_MS = 15_000;
/** Total time from mount to the settled rest composition. */
export const ORB_HERO_SETTLE_MS = ORB_LIVING_DELAY_MS + ORB_HERO_DURATION_MS;
/** Circle rotor travel, hero: starts displaced, lands at rest (0). */
export const ORB_HERO_CIRCLE_FROM_DEG = -60;
/** Ellipse phi travel, hero: endpoints exchange ends, land at rest. */
export const ORB_HERO_ELLIPSE_TRAVEL_DEG = -180;
/** Arc precession, hero: counter-rotates against the circle rotor. */
export const ORB_HERO_ARC_FROM_DEG = 55;
/** Ambient laps (ms), unchanged from v1's QUIET values. */
export const ORB_AMBIENT_DURATIONS_MS = { circle: 96_000, ellipse: 72_000, arc: 160_000 } as const;
/** Ambient ellipse travel per lap: one full turn of phi. */
export const ORB_AMBIENT_ELLIPSE_TRAVEL_DEG = -360;

/** Which ring a rest point belongs to, from the measured geometry. */
export function ringOfPoint(p: { cx: number; cy: number }): "circle" | "ellipse" {
  const ex = (p.cx - ORB_HRING.cx) / ORB_HRING.rx;
  const ey = (p.cy - ORB_HRING.cy) / ORB_HRING.ry;
  return Math.abs(ex * ex + ey * ey - 1) < 0.05 ? "ellipse" : "circle";
}

/** Base angle (deg) of a circular-ring point, from its rest position. */
export function circleBaseAngleDeg(p: { cx: number; cy: number }): number {
  return Math.round((Math.atan2(p.cy - ORB_RING.cy, p.cx - ORB_RING.cx) * 180) / Math.PI);
}

/** Rest phi (deg) of an ellipse point, from its rest position. */
export function ellipseRestPhiDeg(p: { cx: number; cy: number }): number {
  const deg =
    (Math.atan2((p.cy - ORB_HRING.cy) / ORB_HRING.ry, (p.cx - ORB_HRING.cx) / ORB_HRING.rx) * 180) /
    Math.PI;
  return Math.round(deg);
}

/** Parametric ellipse position at phi (deg) - the ring itself. */
export function ellipsePoint(phiDeg: number): { cx: number; cy: number } {
  const a = (phiDeg * Math.PI) / 180;
  return {
    cx: ORB_HRING.cx + ORB_HRING.rx * Math.cos(a),
    cy: ORB_HRING.cy + ORB_HRING.ry * Math.sin(a),
  };
}

/** easeOutCubic - the shared settle profile (the circle rotor's CSS
 *  uses its cubic-bezier twin; the ellipse samples bake this in). */
export function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

export type RingTravelKeyframe = {
  offset: number;
  cx: number;
  cy: number;
  transform: string;
};

/**
 * The generating law for the ellipse riders' CSS keyframes
 * (committed in orb.css, pinned to this function by test):
 * samples of the parametric equation with phi travelling
 * `travelDeg` and LANDING EXACTLY on the rest phi. Profile
 * "settle" bakes easeOutCubic into phi(t) (hero); profile "lap"
 * moves phi linearly (the ambient rider's continuous lap).
 * Every returned position lies on the measured ellipse (the
 * transform string is the same point rounded to 3dp, exactly
 * as committed in the CSS). The point's motion is a function
 * of the ring's phi alone - it cannot leave the ring, and its
 * final keyframe is its rest position.
 */
export function buildEllipseTravelKeyframes(
  restPhiDeg: number,
  travelDeg: number,
  steps = 40,
  profile: "settle" | "lap" = "settle",
): RingTravelKeyframe[] {
  const frames: RingTravelKeyframe[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const p = i / steps;
    const phi =
      profile === "lap"
        ? restPhiDeg + travelDeg * p
        : restPhiDeg + travelDeg * (1 - easeOutCubic(p));
    const pos = i === steps && profile === "settle" ? ellipsePoint(restPhiDeg) : ellipsePoint(phi);
    frames.push({
      offset: p,
      cx: pos.cx,
      cy: pos.cy,
      transform: `translate(${Math.round(pos.cx * 1000) / 1000}px, ${Math.round(pos.cy * 1000) / 1000}px)`,
    });
  }
  return frames;
}

const CIRCLE_POINTS = ORB_POINTS.filter((p) => ringOfPoint(p) === "circle");
const ELLIPSE_POINTS = ORB_POINTS.filter((p) => ringOfPoint(p) === "ellipse");

/** Lit arc on the circular ring: a 64-degree span of the ring. */
function arcPath(spanDeg: number, startDeg: number): string {
  const pt = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return {
      cx: Math.round((ORB_RING.cx + ORB_RING.r * Math.cos(a)) * 10) / 10,
      cy: Math.round((ORB_RING.cy + ORB_RING.r * Math.sin(a)) * 10) / 10,
    };
  };
  const p0 = pt(startDeg);
  const p1 = pt(startDeg + spanDeg);
  return `M ${p0.cx} ${p0.cy} A ${ORB_RING.r} ${ORB_RING.r} 0 0 1 ${p1.cx} ${p1.cy}`;
}

/** R19 W27 (AT-06) - the ambient (dock) rings' state key. The dock
 *  orb stays alive, but it stops pretending: with NO live state it
 *  takes the REST signature (laps slow 4x, points dim - presence at
 *  rest, AR-12's condition), and with a live state it runs the
 *  normal laps tinted to that state's family. Priority is the
 *  reveal priority (AR-F4): action > happening > ready > forming;
 *  past never keys the orb. */
export const ORB_AMBIENT_STATE_PRIORITY: readonly OrbIndicatorState[] = [
  "action",
  "happening",
  "ready",
  "forming",
] as const;

export function orbAmbientStateFromFamilies(
  families: readonly (string | null | undefined)[],
): OrbIndicatorState | null {
  for (const family of ORB_AMBIENT_STATE_PRIORITY) {
    if (families.includes(family)) return family;
  }
  return null;
}

export function OrbLivingRings({
  variant = "hero",
  className,
  liveState,
}: {
  variant?: "hero" | "ambient";
  className?: string;
  /** AT-06: the strongest live state family, or null when nothing
   *  is live. Ambient variant only; hero ignores it. */
  liveState?: OrbIndicatorState | string | null;
}) {
  const reduced = usePrefersReducedMotion();
  const [settled, setSettled] = useState(false);
  const [paused, setPaused] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = nextId(variant);
  const glowId = `${idRef.current}-glow`;
  const hero = variant === "hero";

  const resting = reduced || (hero && settled);

  /* Settle clock (hero): at delay + duration the living phase is
   * over and the component renders the rest branch - the settled
   * frame IS the still composition. */
  useEffect(() => {
    if (reduced || !hero) return;
    const t = setTimeout(() => setSettled(true), ORB_HERO_SETTLE_MS);
    return () => clearTimeout(t);
  }, [reduced, hero]);

  /* Pause when hidden or off-screen: presence never burns cycles
   * nobody can see. All v2 motion is CSS, so pausing is one
   * attribute: data-paused -> animation-play-state (orb.css). */
  useEffect(() => {
    if (reduced) return;
    const el = svgRef.current;
    if (!el) return;
    let hidden = typeof document !== "undefined" && document.hidden;
    let visible = true;
    const apply = () => setPaused(hidden || !visible);
    const onVis = () => {
      hidden = document.hidden;
      apply();
    };
    document.addEventListener("visibilitychange", onVis);
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
          apply();
        },
        { threshold: 0.01 },
      );
      io.observe(el);
    }
    apply();
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, [reduced, resting]);

  const haloR = hero ? 6 : 5;
  const coreR = hero ? 2 : 1.7;

  /* Ambient circle travelers (v1's pair on the mark's ring); the
   * hero rides the rest points themselves. */
  const ambientCirclePoints = [30, 210].map((a) => {
    const rad = (a * Math.PI) / 180;
    return {
      cx: Math.round((ORB_RING.cx + ORB_RING.r * Math.cos(rad)) * 10) / 10,
      cy: Math.round((ORB_RING.cy + ORB_RING.r * Math.sin(rad)) * 10) / 10,
      angle: a,
    };
  });
  const circlePoints = hero
    ? CIRCLE_POINTS.map((p) => ({ cx: p.cx, cy: p.cy, angle: circleBaseAngleDeg(p) }))
    : ambientCirclePoints;
  /* Ambient: one rider (v1's count) - the right-endpoint point. */
  const ellipsePoints = hero ? ELLIPSE_POINTS : [ELLIPSE_POINTS[0]];

  return (
    <svg
      ref={svgRef}
      className={`orb-living-rings orb-living-rings--${variant} ${className ?? ""}`.trim()}
      viewBox="0 0 200 200"
      aria-hidden
      data-orb-living-rings={variant}
      data-motion={reduced ? "rest" : hero && settled ? "settled" : "living"}
      data-paused={paused ? "true" : "false"}
      data-ambient-state={
        hero
          ? undefined
          : isOrbIndicatorState(liveState)
            ? liveState
            : "rest"
      }
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="var(--orb-point-light)" stopOpacity="0.85" />
          <stop offset="45%" stopColor="var(--orb-fire-gold)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--orb-fire-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {resting ? (
        /* REST - also the hero's SETTLED state (same code path, so
         * the settled frame is the still composition by
         * construction): the measured points of light, static.
         * Ambient rests to nothing - the mark beneath already
         * carries its points. */
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
          {/* Precessing lit arc: its own rotor on the circular
           * ring, counter-rotating against the circle rotor.
           * Hero it lands at 0deg faded out (the rest composition
           * has no live arc); ambient it precesses indefinitely. */}
          <g
            className={hero ? "orb-ring-arc orb-ring-arc--hero" : "orb-ring-arc orb-ring-arc--ambient"}
            data-ring-arc="circle"
            data-arc-from-deg={hero ? ORB_HERO_ARC_FROM_DEG : 360}
            data-arc-to-deg={0}
            data-arc-duration-ms={hero ? ORB_HERO_DURATION_MS : ORB_AMBIENT_DURATIONS_MS.arc}
            data-arc-iterations={hero ? "1" : "infinite"}
            opacity={hero ? 0.4 : 0.22}
          >
            <path
              d={arcPath(64, -90)}
              fill="none"
              stroke="var(--orb-ring-metal-lit)"
              strokeWidth={hero ? 2.2 : 1.8}
              strokeLinecap="round"
            />
          </g>

          {/* The circular ring ROTATES (CSS rotor, compositor):
           * the points are its children, so each point's angle
           * is base + rotor angle - attached to the ring by
           * construction, incapable of leaving it. */}
          <g
            className={
              hero ? "orb-ring-rotor orb-ring-rotor--hero" : "orb-ring-rotor orb-ring-rotor--ambient"
            }
            data-ring-rotor="circle"
            data-rotor-from-deg={hero ? ORB_HERO_CIRCLE_FROM_DEG : 0}
            data-rotor-to-deg={hero ? 0 : 360}
            data-rotor-duration-ms={hero ? ORB_HERO_DURATION_MS : ORB_AMBIENT_DURATIONS_MS.circle}
            data-rotor-iterations={hero ? "1" : "infinite"}
          >
            {circlePoints.map((p) => (
              <g
                key={p.angle}
                data-ring-point="circle"
                data-base-angle-deg={p.angle}
                transform={`translate(${p.cx} ${p.cy})`}
              >
                <TravelPoint haloR={haloR} coreR={coreR} glowId={glowId} opacity={hero ? 0.95 : 0.75} />
              </g>
            ))}
          </g>

          {/* The horizontal ring's riders: each point rides CSS
           * keyframes sampled from the ring's own parametric
           * equation (see buildEllipseTravelKeyframes - the
           * committed keyframes in orb.css are pinned to that
           * law by test) - phi is the ring's rotation, the point
           * is a function of phi alone. The class selects the
           * keyframe block for the point's rest phi. Base
           * transform = the rest position (what shows if CSS
           * animations are unavailable). */}
          <g data-ring-riders="ellipse">
            {ellipsePoints.map((p) => {
              const restPhi = ellipseRestPhiDeg(p);
              return (
                <g
                  key={restPhi}
                  className={`orb-ellipse-rider orb-ellipse-rider--${hero ? "hero" : "ambient"}-${restPhi}`}
                  data-ring-point="ellipse"
                  data-rest-phi-deg={restPhi}
                  data-travel-deg={hero ? ORB_HERO_ELLIPSE_TRAVEL_DEG : ORB_AMBIENT_ELLIPSE_TRAVEL_DEG}
                  data-duration-ms={hero ? ORB_HERO_DURATION_MS : ORB_AMBIENT_DURATIONS_MS.ellipse}
                  data-iterations={hero ? "1" : "infinite"}
                  transform={`translate(${p.cx} ${p.cy})`}
                  opacity={hero ? 0.95 : 0.75}
                >
                  <TravelPoint haloR={haloR * 0.85} coreR={coreR * 0.9} glowId={glowId} />
                </g>
              );
            })}
          </g>
        </g>
      )}
    </svg>
  );
}
