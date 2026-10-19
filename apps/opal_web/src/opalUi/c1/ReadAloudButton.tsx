/**
 * ST-I (Repair #18 adoption wave 3), re-homed by Repair #19 W6 -
 * Opal speaks back, under its true name.
 *
 * Founder law (2026-10-18): "Opal doesn't listen - it graphs. That's
 * our thing." The old "Listen" control was TTS playback mislabeled
 * as listening, and in a thread it was squeezed INSIDE the Opal
 * bubble, where the bubble's flex row crushed it into a narrow
 * vertical rail that spelled the word letter-by-letter down the
 * side of the message (harmony2 section 1, MT-13). The function is
 * real, so it is kept - under the honest label "Read aloud", as its
 * own horizontal action row OUTSIDE the bubble / card body, never a
 * rail inside it.
 *
 * A Read aloud action reads aloud EXACTLY the finished text it is
 * attached to - the same string handed to the TTS provider, nothing
 * spoken-only. The control exists only when the server reports a
 * TTS provider is configured truthfully (GET /voice/status):
 * unconfigured or unknown renders NOTHING - never a silent button.
 * Playing state is visible, playback is stoppable, and unmounting
 * the surface stops the audio (no orphan audio on surface exit).
 *
 * EXPERIENCE (R19 interpretive key - functional parity, experiential
 * invention): the function is unchanged, the form is Opal's, not a
 * media player's. The control is Opal's own presence mark - the
 * same iris orb that marks Opal in the graph - with its label
 * beside it; while the words play, the mark itself pulses
 * (Opal speaks FROM its node in the conversation, it does not
 * borrow a tape-deck button). The LABEL stays the literal words
 * "Read aloud": clarity wins over metaphor - a coined name would
 * be a renamed rail, not an invention.
 */
import React, { useEffect, useRef, useState } from "react";
import { fetchVoiceStatus, speakApprovedText } from "../../api/productClient";

let statusCache: Promise<boolean> | null = null;

/** Test seam: drop the cached provider status between fixtures. */
export function resetReadAloudStatusCache() {
  statusCache = null;
}

function ttsConfigured(bearer?: string): Promise<boolean> {
  if (!statusCache) {
    statusCache = fetchVoiceStatus(bearer)
      .then((s) => s.tts_configured === true)
      .catch(() => false);
  }
  return statusCache;
}

export function ReadAloudButton({
  text,
  bearer,
}: {
  /** The exact displayed text to speak - passed verbatim to the provider. */
  text: string;
  bearer?: string;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let live = true;
    void ttsConfigured(bearer).then((ok) => {
      if (live) setConfigured(ok);
    });
    return () => {
      live = false;
    };
  }, [bearer]);

  // Stop on surface exit: unmount pauses the audio element.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (!configured || !text.trim()) return null;

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setState("idle");
  };

  const play = async () => {
    setState("loading");
    try {
      const res = await speakApprovedText({ text, approved: true }, bearer);
      if (!res.audio_url) {
        setState("error");
        return;
      }
      const audio = new Audio(res.audio_url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      await audio.play();
      setState("playing");
    } catch {
      setState("error");
    }
  };

  if (state === "playing") {
    return (
      <button
        type="button"
        className="c1-read-aloud-btn"
        data-testid="read-aloud-stop"
        aria-label="Stop reading aloud"
        onClick={stop}
      >
        <span className="c1-read-aloud-orb is-speaking" aria-hidden="true" />
        <span>Stop reading</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="c1-read-aloud-btn"
      data-testid="read-aloud-play"
      aria-label="Read aloud"
      disabled={state === "loading"}
      onClick={() => void play()}
    >
      <span className="c1-read-aloud-orb" aria-hidden="true" />
      <span>
        {state === "loading" ? "Loading" : state === "error" ? "Read aloud - try again" : "Read aloud"}
      </span>
    </button>
  );
}
