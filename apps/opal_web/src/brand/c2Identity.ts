/**
 * Repair #18 - Division C2 - interim identity assets (track-c2 section 1).
 *
 * RETIRED (founder, 2026-10-18 12:53 PDT): THE ORB IS THE LOGO,
 * PERMANENTLY. The Join wordmark, the Loop character, the faceless
 * mark, and the app icon named here were the shell's INTERIM identity
 * (the DIR-5 family). They are NOT an alternate and NOT a fallback
 * identity inside the new design: no surface in the integrated C2
 * build renders them - the foundation gallery's identity plate was
 * removed in harmony-0, the C2 icon slots resolve to the orb master
 * (main.tsx), and the only identity the shell renders is the orb
 * system in brand/orb/ (tokens in theme/orbTokens.css). This file
 * remains as the record of the interim geometry (brand/c2Geometry.ts)
 * and the Loop presence-mapping contract the component tests pin;
 * the R17 fallback keeps its OWN older identity, untouched, elsewhere.
 */

export const C2_ASSETS = {
  wordmark: "/brand/c2/opal-c2-wordmark.svg",
  wordmarkGradient: "/brand/c2/opal-c2-wordmark-gradient.svg",
  lockupHero: "/brand/c2/opal-c2-lockup-hero.svg",
  lockupInline: "/brand/c2/opal-c2-lockup-inline.svg",
  mark: "/brand/c2/opal-c2-mark.svg",
  appIcon: "/brand/c2/opal-c2-app-icon.svg",
  appIcon1024: "/brand/c2/opal-c2-app-icon-1024.png",
  appIcon512: "/brand/c2/opal-c2-app-icon-512.png",
  appIcon180: "/brand/c2/opal-c2-app-icon-180.png",
  character: {
    rest: "/brand/c2/opal-c2-character-rest.svg",
    glad: "/brand/c2/opal-c2-character-glad.svg",
    thinking: "/brand/c2/opal-c2-character-thinking.svg",
    listening: "/brand/c2/opal-c2-character-listening.svg",
    sleep: "/brand/c2/opal-c2-character-sleep.svg",
  },
} as const;

/** The five lawful Loop expressions (section 1.3). No others exist. */
export type LoopExpression = keyof typeof C2_ASSETS.character;

/**
 * Presence mapping (C1 section 8 + C2 section 1.3 honesty law): the
 * character renders an expression ONLY from a real signal the caller
 * derived (mic capturing, request in flight, real completion, honest
 * empty). No signal means Rest. This map is the whole contract -
 * callers pass the derived presence, never a timer or a mount effect.
 */
export type LoopPresenceSignal =
  | "idle"
  | "listening"
  | "thinking"
  | "completed"
  | "empty";

export function loopExpressionForPresence(
  signal: LoopPresenceSignal | null | undefined,
): LoopExpression {
  switch (signal) {
    case "listening":
      return "listening";
    case "thinking":
      return "thinking";
    case "completed":
      return "glad";
    case "empty":
      return "sleep";
    default:
      return "rest";
  }
}

/** Below 64px the character is always the faceless mark (section 1.4). */
export const LOOP_FACE_MIN_PX = 64;
