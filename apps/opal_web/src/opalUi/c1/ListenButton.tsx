/**
 * ST-I (Repair #18 adoption wave 3) - Opal speaks back.
 *
 * A Listen action reads aloud EXACTLY the finished text it is attached
 * to - the same string handed to the TTS provider, nothing spoken-only.
 * The control exists only when the server reports a TTS provider is
 * configured truthfully (GET /voice/status): unconfigured or unknown
 * renders NOTHING - never a silent button. Playing state is visible,
 * playback is stoppable, and unmounting the surface stops the audio
 * (no orphan audio on surface exit).
 */
import React, { useEffect, useRef, useState } from "react";
import { fetchVoiceStatus, speakApprovedText } from "../../api/productClient";

let statusCache: Promise<boolean> | null = null;

/** Test seam: drop the cached provider status between fixtures. */
export function resetListenStatusCache() {
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

export function ListenButton({
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
        className="c1-listen-btn"
        data-testid="listen-stop"
        aria-label="Stop listening"
        onClick={stop}
      >
        Playing - Stop
      </button>
    );
  }
  return (
    <button
      type="button"
      className="c1-listen-btn"
      data-testid="listen-play"
      aria-label="Listen"
      disabled={state === "loading"}
      onClick={() => void play()}
    >
      {state === "loading" ? "Loading" : state === "error" ? "Listen - try again" : "Listen"}
    </button>
  );
}
