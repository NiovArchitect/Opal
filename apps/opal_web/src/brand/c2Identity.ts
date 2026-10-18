/**
 * Repair #18 - Division C2 - NEW identity assets (track-c2 section 1).
 *
 * The Join wordmark, the Loop character, the faceless mark, and the app
 * icon live under public/brand/c2/. The retired R17 assets stay exactly
 * where they are for the fallback; no old path is reused here.
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
