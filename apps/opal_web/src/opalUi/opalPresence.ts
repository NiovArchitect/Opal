/**
 * Repair #17 W6 — Founder presence quartet for the Opal Center character.
 *
 * The founder-facing presence is exactly four states:
 *   idle · listening · thinking · responding
 *
 * HARD LAW (honesty): every non-idle state is derived from a REAL app
 * signal only —
 *   listening  ⇐ a microphone is actually capturing (STT session open)
 *   thinking   ⇐ an assistant request is actually in flight
 *   responding ⇐ a reply is actually arriving / audio is actually playing
 * With no signal, the presence is idle. There is no timer, no random
 * "activity", and no surface may fake a state it has no signal for.
 *
 * This module is the single mapping layer between the richer internal
 * living-character machine (livingCharacterState.ts, W6A1) and the
 * founder quartet, plus a pure signal→presence derivation for surfaces
 * and tests.
 */
import type { LivingCharacterState } from "./livingCharacterState";

export const OPAL_PRESENCE_STATES = [
  "idle",
  "listening",
  "thinking",
  "responding",
] as const;

export type OpalPresenceState = (typeof OPAL_PRESENCE_STATES)[number];

/** Real app signals that may drive the character. All optional; none ⇒ idle. */
export type OpalPresenceSignals = {
  /** A microphone is actually capturing right now (STT session open). */
  listening?: boolean;
  /** An assistant request is actually in flight right now. */
  requestInFlight?: boolean;
  /** A reply is actually arriving or reply audio is actually playing. */
  responding?: boolean;
};

/**
 * Pure signal → presence derivation.
 * Priority (newest user-facing activity wins):
 *   listening (user is speaking now) >
 *   thinking (request in flight) >
 *   responding (reply arriving / playing) >
 *   idle (no signal — the only possible result when nothing is happening)
 */
export function deriveOpalPresence(signals: OpalPresenceSignals): OpalPresenceState {
  if (signals.listening) return "listening";
  if (signals.requestInFlight) return "thinking";
  if (signals.responding) return "responding";
  return "idle";
}

/**
 * Map the internal living-character machine onto the founder quartet.
 *
 * - listening  ⇐ machine "listening" only (mic_open happened; the machine
 *   never enters it on a timer — see livingCharacterState honesty law).
 *   The tap beats "notice"/"prepare" are NOT listening: the mic is not
 *   capturing yet, so they stay idle in the quartet.
 * - thinking   ⇐ "processing" (utterance captured, request being formed /
 *   in flight) and "thinking" (request_start happened).
 * - responding ⇐ "response_ready" (entered only via request_end — a real
 *   reply arrived) and "speaking" (entered only via speech_start — audio
 *   is actually playing).
 * - idle       ⇐ "idle", "notice", "prepare", "back_to_idle".
 */
export function presenceStateForLivingState(
  state: LivingCharacterState,
): OpalPresenceState {
  switch (state) {
    case "listening":
      return "listening";
    case "processing":
    case "thinking":
      return "thinking";
    case "response_ready":
    case "speaking":
      return "responding";
    case "idle":
    case "notice":
    case "prepare":
    case "back_to_idle":
      return "idle";
  }
}

/** Calm consumer copy per presence state (status line under the character). */
export const OPAL_PRESENCE_COPY: Record<OpalPresenceState, string> = {
  idle: "Opal is ready.",
  listening: "Voice input is on",
  thinking: "Finding the best response.",
  responding: "Responding",
};
