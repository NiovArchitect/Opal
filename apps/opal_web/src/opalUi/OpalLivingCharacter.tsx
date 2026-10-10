/**
 * W6A1 — Living Opal Center character as the voice-interaction button.
 * Founder character art only. State-driven CSS (no GIF loop, no Rive required).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BRAND_ASSETS } from "../brand/brand";
import {
  headphonesVisible,
  initialLivingCharacter,
  LIVING_STATE_COPY,
  reduceLivingCharacter,
  type LivingCharacterMachine,
  type LivingCharacterState,
} from "./livingCharacterState";
import {
  listenOnce,
  probeMicPermission,
  requestMicPermission,
  speakText,
  stopListening,
  stopSpeaking,
  type SttResult,
} from "./opalCenterVoice";

type Props = {
  size?: number;
  className?: string;
  testId?: string;
  /** When true, assistant request is in flight (thinking honesty). */
  requestInFlight?: boolean;
  /** When true, TTS/audio is actually playing (speaking honesty). Parent-owned audio. */
  audioPlaying?: boolean;
  /** Optional: parent wants transcript text after listen. */
  onTranscript?: (text: string) => void;
  /** Optional: speak this when set (component-owned TTS). Prefer audioPlaying when parent speaks. */
  speakQueue?: string | null;
  onSpeakDone?: () => void;
  /** Disable voice path (e.g. offline). */
  voiceEnabled?: boolean;
};

function HeadphonesOverlay() {
  return (
    <svg
      className="opal-living-headphones"
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      aria-hidden
    >
      <path
        d="M12 30c0-11 9-20 20-20s20 9 20 20"
        fill="none"
        stroke="#00E5FF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="8" y="28" width="10" height="16" rx="4" fill="#8B5CF6" opacity="0.92" />
      <rect x="46" y="28" width="10" height="16" rx="4" fill="#8B5CF6" opacity="0.92" />
    </svg>
  );
}

function LightbulbMotif() {
  return (
    <span className="opal-living-lightbulb" aria-hidden>
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path
          d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.8c.6.5 1 1.2 1.1 2h4.8c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"
          fill="none"
          stroke="#FFC86B"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Live mic amplitude 0..1 while capturing. Stops tracks on dispose. */
function useMicLevel(active: boolean, onLevel: (n: number) => void) {
  useEffect(() => {
    if (!active) {
      onLevel(0);
      return;
    }
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i]! - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          onLevel(Math.min(1, rms * 4));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        onLevel(0);
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => undefined);
      onLevel(0);
    };
  }, [active, onLevel]);
}

export function OpalLivingCharacter({
  size = 72,
  className,
  testId = "opal-living-character",
  requestInFlight = false,
  audioPlaying = false,
  onTranscript,
  speakQueue = null,
  onSpeakDone,
  voiceEnabled = true,
}: Props) {
  const [machine, setMachine] = useState<LivingCharacterMachine>(initialLivingCharacter);
  const machineRef = useRef(machine);
  machineRef.current = machine;
  const listenGen = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const dispatch = useCallback((event: Parameters<typeof reduceLivingCharacter>[1]) => {
    setMachine((prev) => reduceLivingCharacter(prev, event));
  }, []);

  const setMicLevel = useCallback((n: number) => {
    setMachine((prev) => (prev.state === "listening" ? { ...prev, micLevel: n } : prev));
  }, []);

  useMicLevel(machine.state === "listening", setMicLevel);

  const openMicAndListen = useCallback(async () => {
    if (!voiceEnabled) {
      dispatch({ type: "mic_unavailable" });
      return;
    }
    const gen = ++listenGen.current;
    // Never short-circuit on probe "denied" — iOS often false-denies Permissions API.
    // Honesty: listening only after a real mic/STT open attempt succeeds.
    void probeMicPermission();
    const perm = await requestMicPermission();
    if (perm === "denied") {
      // Still attempt listenOnce; only trust a real STT denial.
    } else if (gen !== listenGen.current) {
      return;
    }
    // Optimistic listening only after getUserMedia / STT path is about to run.
    dispatch({ type: "mic_open" });
    try {
      navigator.vibrate?.(10);
    } catch {
      /* */
    }
    const result: SttResult = await listenOnce();
    if (gen !== listenGen.current) return;
    if (result.status === "denied") {
      dispatch({ type: "mic_denied" });
      return;
    }
    if (result.status === "unavailable" || result.status === "offline") {
      dispatch({ type: "mic_unavailable" });
      return;
    }
    if (result.status === "ok" && result.text.trim()) {
      dispatch({ type: "utterance_captured" });
      onTranscriptRef.current?.(result.text.trim());
    } else {
      // Empty / no speech — leave listening honestly via back path (mic closed).
      dispatch({ type: "speech_end" });
    }
  }, [voiceEnabled, dispatch]);

  // Honest thinking: only while request in flight
  useEffect(() => {
    if (requestInFlight) {
      dispatch({ type: "request_start" });
    } else if (machineRef.current.state === "thinking") {
      dispatch({ type: "request_end" });
    }
  }, [requestInFlight, dispatch]);

  // Honest speaking: only while audio is actually playing (parent-owned TTS)
  useEffect(() => {
    if (audioPlaying) {
      dispatch({ type: "speech_start" });
    } else if (machineRef.current.state === "speaking") {
      dispatch({ type: "speech_end" });
    }
  }, [audioPlaying, dispatch]);

  // Timed micro-beats + prepare → mic
  useEffect(() => {
    const s = machine.state;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (s === "notice") {
      t = setTimeout(() => dispatch({ type: "timer", name: "notice_done" }), 420);
    } else if (s === "prepare") {
      t = setTimeout(() => {
        void openMicAndListen();
      }, 380);
    } else if (s === "response_ready") {
      t = setTimeout(() => {
        if (!speakQueue) dispatch({ type: "speech_end" });
      }, 480);
    } else if (s === "back_to_idle") {
      t = setTimeout(() => dispatch({ type: "timer", name: "back_done" }), 520);
    } else if (s === "processing") {
      t = setTimeout(() => {
        if (!requestInFlight && machineRef.current.state === "processing") {
          dispatch({ type: "speech_end" });
        }
      }, 600);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [machine.state, dispatch, speakQueue, requestInFlight, openMicAndListen]);

  // Parent-driven TTS
  useEffect(() => {
    if (!speakQueue) return;
    let cancelled = false;
    (async () => {
      dispatch({ type: "speech_start" });
      try {
        await speakText(speakQueue);
      } finally {
        if (!cancelled) {
          dispatch({ type: "speech_end" });
          onSpeakDone?.();
        }
      }
    })();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [speakQueue, dispatch, onSpeakDone]);

  const onTap = () => {
    const s = machine.state;
    if (s === "listening") {
      listenGen.current += 1;
      stopListening();
      dispatch({ type: "speech_end" });
      return;
    }
    if (s === "speaking") {
      stopSpeaking();
      dispatch({ type: "speech_end" });
      return;
    }
    if (s !== "idle" && s !== "back_to_idle") return;
    try {
      navigator.vibrate?.(8);
    } catch {
      /* */
    }
    dispatch({ type: "tap" });
  };

  const state: LivingCharacterState = machine.state;
  const showHp = headphonesVisible(state);
  const borderPulse =
    state === "listening"
      ? 0.35 + machine.micLevel * 0.65
      : state === "speaking"
        ? 0.55
        : state === "thinking"
          ? 0.45
          : 0.55;

  const status =
    machine.permissionPrompt ||
    (state === "listening"
      ? "Listening"
      : state === "thinking"
        ? LIVING_STATE_COPY.thinking
        : state === "speaking"
          ? "Speaking"
          : null);

  return (
    <div className={`opal-living-wrap ${className ?? ""}`.trim()}>
      <button
        type="button"
        className={`opal-living-character opal-living-${state}`}
        data-testid={testId}
        data-living-state={state}
        data-headphones={showHp ? "1" : "0"}
        aria-label={
          machine.permissionPrompt
            ? machine.permissionPrompt
            : state === "listening"
              ? "Stop listening"
              : "Talk to Opal"
        }
        style={
          {
            width: size,
            height: size,
            ["--opal-living-pulse" as string]: String(borderPulse),
          } as React.CSSProperties
        }
        onClick={onTap}
      >
        <span className="opal-living-border" aria-hidden />
        <span className="opal-living-frame">
          <img
            className="opal-living-art"
            src={BRAND_ASSETS.opalCharacter}
            alt=""
            width={size}
            height={size}
            draggable={false}
          />
          {showHp ? <HeadphonesOverlay /> : null}
          {state === "thinking" ? <LightbulbMotif /> : null}
        </span>
      </button>
      {status ? (
        <p
          className="opal-living-status"
          data-testid="opal-living-status"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
