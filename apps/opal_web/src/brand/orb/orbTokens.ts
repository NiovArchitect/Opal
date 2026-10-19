/**
 * Repair #18 - THE ORB SYSTEM - sampled palette + the indicator
 * language (single source other surfaces consume).
 *
 * PROVENANCE: every color below was sampled programmatically from
 * the founder's masters by scripts/orb/sample_masters.py; the full
 * record is src/brand/orb/orbSampled.json (fire sector medians, core
 * and peak samples, ring metal, points of light, wordmark gradient
 * slices, gem-O facets). Code never approximates the drawing's
 * colors from memory.
 *
 * INDICATOR LAW (founder Persistent Indicator Language, 2026-10-18
 * 06:18 PDT; MP-11 indicator drift / SP-11): the state spectrum is
 * pinned to the canonical hexes, invariant across every surface and
 * mode. Where a sampled state value differs from the canon, THE
 * CANON VALUE WINS as the token value; both are recorded here and in
 * orb-system-report.md. The canonical values are the same values
 * theme/planStateColors.ts already carries - one canon, two mirrors,
 * pinned together by orbTokens.test.ts.
 */
import { PLAN_STATE_HEX } from "../../theme/planStateColors";

/** Sampled fire sectors (peak = top 5% by saturation x value). */
export const ORB_SAMPLED = {
  fieldOrb: "#000000",
  fieldWordmark: "#18141c",
  fireVioletPeak: "#7d4dce",
  fireBluePeak: "#6257c7",
  fireCyanPeak: "#60b9d8",
  fireMagentaPeak: "#d972c2",
  fireGoldPeak: "#f1aa62",
  fireGoldCore: "#fedc9a",
  fireRedOrangePeak: "#d0856e",
  ringMetal: "#dbae8e",
  ringMetalLit: "#ffeac9",
  pointsOfLight: "#fff1d0",
  /** Sampled state anchors (provenance; NOT the indicator values). */
  sampledState: {
    formingVioletMedian: "#5d398a",
    happeningCyanMedian: "#5487a4",
    readyGoldMedian: "#ebb27f",
    actionRedOrangeMedian: "#815049",
  },
  /** Wordmark left-to-right gradient, 8 sampled x-slices. */
  wordmarkGradient: [
    "#9168cb",
    "#9ba8da",
    "#897be7",
    "#7387da",
    "#6294ce",
    "#c2a4a9",
    "#c3c3b7",
    "#dcad82",
  ],
} as const;

/**
 * THE INDICATOR LANGUAGE - canonical, mode-invariant (MP-11).
 * These are the values the --orb-indicator-* CSS tokens carry in
 * BOTH modes, and the only state hues fire-language components use.
 */
export const ORB_INDICATOR = {
  forming: PLAN_STATE_HEX.forming, // #8B5CF6 (canon; sampled violet median #5d398a recorded above)
  happening: PLAN_STATE_HEX.happening, // #00E5FF (canon; sampled cyan median #5487a4)
  ready: PLAN_STATE_HEX.ready, // #FFC86B (canon; sampled gold median #ebb27f)
  action: PLAN_STATE_HEX.action, // #FF4D5E (canon; sampled red-orange median #815049)
  past: PLAN_STATE_HEX.past, // #FFFFFF (canon; the stone at rest - no glow)
} as const;

export type OrbIndicatorState = keyof typeof ORB_INDICATOR;

/** Orb brand assets (public/brand/orb/). The hero IS the master. */
export const ORB_ASSETS = {
  /** The master itself, luminosity-keyed (scripts/orb/build_hero_assets.py). */
  hero: "/brand/orb/opal-orb-hero.webp",
  hero512: "/brand/orb/opal-orb-hero-512.webp",
  /** Light-mode variant: the master in its own dark medallion (jewel-in-case). */
  medallion: "/brand/orb/opal-orb-medallion.webp",
  /** Splash 1 full-bleed: the master composition itself, field and
   * all, resize-only derivation (scripts/orb/build_splash_master.py). */
  masterFull: "/brand/orb/opal-orb-master-full.webp",
  /** App icon raster, derived FROM the master by downscale on the
   * master's own night field, no text (scripts/orb/
   * build_icon_assets.py; harmony2 icon pass - the orb is the logo,
   * everywhere). The generic served slots (favicon-32,
   * favicon-48, opal-app-icon-*) carry this same derivation. */
  icon1024: "/brand/orb/opal-orb-icon-1024.png",
  /** Vector reductions (small sizes + chrome only, never hero). */
  mark: "/brand/orb/opal-orb-mark.svg",
  markMono: "/brand/orb/opal-orb-mark-mono.svg",
  wordmark: "/brand/orb/opal-orb-wordmark.svg",
  lockup: "/brand/orb/opal-orb-lockup.svg",
  gemPattern: "/brand/orb/opal-gem-pattern.svg",
} as const;
