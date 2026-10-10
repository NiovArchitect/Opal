/**
 * W6 Amendment 1 — Opal Center living character state machine.
 * Advances on real app events only. Never GIF-loop the sequence.
 *
 * Honesty:
 * - listening only while mic is capturing
 * - thinking only while a real assistant request is in flight
 * - speaking only while audio is actually playing
 * - mic denied → idle + honest prompt (never fake listening)
 */

export const LIVING_CHARACTER_STATES = [
  "idle",
  "notice",
  "prepare",
  "listening",
  "processing",
  "thinking",
  "response_ready",
  "speaking",
  "back_to_idle",
] as const;

export type LivingCharacterState = (typeof LIVING_CHARACTER_STATES)[number];

export const LIVING_STATE_COPY: Record<LivingCharacterState, string> = {
  idle: "Opal is ready.",
  notice: "User taps.",
  prepare: "Opal puts on headphones.",
  listening: "Actively listening.",
  processing: "Understanding.",
  thinking: "Finding the best response.",
  response_ready: "Got it!",
  speaking: "Speaking.",
  back_to_idle: "Continuing the conversation.",
};

/** Headphones visible from notice through back_to_idle (inclusive). */
export function headphonesVisible(state: LivingCharacterState): boolean {
  return state !== "idle";
}

export type LivingCharacterEvent =
  | { type: "tap" }
  | { type: "mic_open" }
  | { type: "mic_denied" }
  | { type: "mic_unavailable" }
  | { type: "utterance_captured" }
  | { type: "request_start" }
  | { type: "request_end" }
  | { type: "speech_start" }
  | { type: "speech_end" }
  | { type: "timer"; name: "notice_done" | "prepare_done" | "processing_done" | "ready_done" | "back_done" }
  | { type: "reset" };

export type LivingCharacterMachine = {
  state: LivingCharacterState;
  /** Honest permission prompt when mic cannot open. */
  permissionPrompt: string | null;
  /** Border pulse 0..1 from live mic amplitude while listening. */
  micLevel: number;
  /** Speech amplitude 0..1 while speaking. */
  speechLevel: number;
};

export function initialLivingCharacter(): LivingCharacterMachine {
  return {
    state: "idle",
    permissionPrompt: null,
    micLevel: 0,
    speechLevel: 0,
  };
}

/**
 * Pure reducer. Timed micro-beats (notice/prepare/processing/ready/back) advance via timer events.
 * Listening / thinking / speaking never auto-advance without real mic / request / audio events.
 */
export function reduceLivingCharacter(
  prev: LivingCharacterMachine,
  event: LivingCharacterEvent,
): LivingCharacterMachine {
  const { state } = prev;

  if (event.type === "reset") {
    return initialLivingCharacter();
  }

  if (event.type === "mic_denied" || event.type === "mic_unavailable") {
    return {
      ...initialLivingCharacter(),
      permissionPrompt:
        event.type === "mic_denied"
          ? "Microphone access is blocked. Enable it in Settings to talk to Opal."
          : "Voice is not set up on this build. Type instead.",
    };
  }

  switch (event.type) {
    case "tap":
      if (state === "idle" || state === "back_to_idle") {
        return { ...prev, state: "notice", permissionPrompt: null, micLevel: 0 };
      }
      // Re-tap while listening stops → back path handled by mic close externally
      return prev;

    case "timer":
      if (event.name === "notice_done" && state === "notice") {
        return { ...prev, state: "prepare" };
      }
      if (event.name === "prepare_done" && state === "prepare") {
        // Stay in prepare until mic_open (honest). Caller opens mic after prepare.
        return prev;
      }
      if (event.name === "processing_done" && state === "processing") {
        // If no request yet, wait; request_start moves to thinking.
        return prev;
      }
      if (event.name === "ready_done" && state === "response_ready") {
        return prev; // speech_start advances
      }
      if (event.name === "back_done" && state === "back_to_idle") {
        return { ...prev, state: "idle", micLevel: 0, speechLevel: 0 };
      }
      return prev;

    case "mic_open":
      if (state === "notice" || state === "prepare" || state === "idle") {
        return { ...prev, state: "listening", permissionPrompt: null };
      }
      return { ...prev, state: "listening", permissionPrompt: null };

    case "utterance_captured":
      if (state === "listening") {
        return { ...prev, state: "processing", micLevel: 0 };
      }
      return prev;

    case "request_start":
      if (
        state === "processing" ||
        state === "listening" ||
        state === "prepare" ||
        state === "notice"
      ) {
        return { ...prev, state: "thinking", micLevel: 0 };
      }
      if (state === "idle") {
        // Text-only request without voice still may show thinking when in flight from composer.
        return { ...prev, state: "thinking" };
      }
      return prev;

    case "request_end":
      if (state === "thinking" || state === "processing") {
        return { ...prev, state: "response_ready" };
      }
      return prev;

    case "speech_start":
      if (
        state === "response_ready" ||
        state === "thinking" ||
        state === "processing" ||
        state === "idle"
      ) {
        return { ...prev, state: "speaking" };
      }
      return prev;

    case "speech_end":
      if (state === "speaking" || state === "response_ready") {
        return { ...prev, state: "back_to_idle", speechLevel: 0 };
      }
      return prev;

    default:
      return prev;
  }
}

/** Advance prepare → listening once headphones settle (caller fires after delay). */
export function afterPrepareReady(
  prev: LivingCharacterMachine,
): LivingCharacterMachine {
  if (prev.state !== "prepare") return prev;
  // Remain prepare until mic_open; this helper is a no-op marker for tests.
  return prev;
}
