/**
 * W8 Phase 2 — Meet opening utterance via Matilda (ElevenLabs).
 * Speaks only the short headline. Never browser system TTS.
 */

import { HOLY_SHIT_COPY } from "./holyShitCopy";
import { apiConfigured, speakApprovedText } from "../api/productClient";

/** Approved Matilda voice id (ElevenLabs free-tier brand default). */
export const OPAL_MATILDA_VOICE_ID = "XrExE9yKIg1WjnnlVkGX";

export const OPENING_UTTERANCE = HOLY_SHIT_COPY.greetingHeadline;

const PLAYED_KEY = "opal.meet.opening_tts.played";

export function openingTtsAlreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem(PLAYED_KEY) === "1";
  } catch {
    return false;
  }
}

function markPlayed(): void {
  try {
    sessionStorage.setItem(PLAYED_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Speak Meet opening via product voice/speak (ElevenLabs Matilda).
 * Returns spoken text + provider meta for evidence logging.
 */
export async function speakMeetOpening(opts?: {
  bearer?: string | null;
  text?: string;
}): Promise<{
  ok: boolean;
  text: string;
  provider?: string;
  voice_id?: string;
  reason?: string;
}> {
  const text = (opts?.text || OPENING_UTTERANCE).trim();
  if (!text) return { ok: false, text, reason: "empty" };
  if (openingTtsAlreadyPlayed()) {
    return { ok: false, text, reason: "already_played" };
  }
  if (!apiConfigured()) {
    return { ok: false, text, reason: "api_unconfigured" };
  }
  if (!opts?.bearer) {
    return { ok: false, text, reason: "no_bearer" };
  }

  try {
    const body = await speakApprovedText(
      { text, approved: true, provider: "elevenlabs" },
      opts.bearer,
    );
    if (!body.audio_url) {
      return {
        ok: false,
        text,
        reason: "no_audio_url",
        provider: body.provider,
      };
    }

    await new Promise<void>((resolve) => {
      const audio = new Audio(body.audio_url!);
      const done = () => resolve();
      audio.addEventListener("ended", done, { once: true });
      audio.addEventListener("error", done, { once: true });
      void audio.play().catch(() => resolve());
      window.setTimeout(done, 12_000);
    });

    markPlayed();
    try {
      console.info("[opal-meet-tts]", {
        text,
        provider: body.provider || "elevenlabs",
        voice_id: OPAL_MATILDA_VOICE_ID,
      });
    } catch {
      /* ignore */
    }
    return {
      ok: true,
      text,
      provider: body.provider || "elevenlabs",
      voice_id: OPAL_MATILDA_VOICE_ID,
    };
  } catch (e) {
    return {
      ok: false,
      text,
      reason: e instanceof Error ? e.message : "tts_failed",
    };
  }
}
