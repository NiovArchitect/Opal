/**
 * Phase OC-6 — native-only STT/TTS for Opal Center chat.
 * Web Speech API in browser; optional nativeHostBridge when present.
 * No third-party STT/TTS APIs.
 */

import {
  isNativeHost,
  shouldUseNativeMediaBridge,
  startNativeSpeechRecognition,
  speakNativeText,
  stopNativeSpeaking,
} from "../nativeHostBridge";

export const VOICE_MODE_KEY_PREFIX = "opal_center_voice_mode:";
export const MIC_BLOCKED_COPY =
  "Microphone access is blocked. Enable it in Settings to talk to Opal.";
export const VOICE_OFFLINE_COPY = "Voice needs internet";
export const STT_FAIL_COPY = "I didn't catch that. Try again or type instead.";
export const LISTENING_COPY = "Listening…";
export const MAX_TTS_MS = 30_000;
export const SILENCE_MS = 3_000;

export type MicPermission = "granted" | "denied" | "prompt" | "unsupported";

export type SttResult =
  | { status: "ok"; text: string }
  | { status: "empty" }
  | { status: "denied" }
  | { status: "offline" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript?: string }> & { isFinal?: boolean }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export type VoiceAdapters = {
  getSpeechRecognition?: () => SpeechRecognitionCtor | null;
  getSpeechSynthesis?: () => SpeechSynthesis | null;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  isOnline?: () => boolean;
  nativeStt?: () => Promise<SttResult>;
  nativeSpeak?: (text: string) => Promise<void>;
  nativeStopSpeak?: () => void;
  now?: () => number;
};

let adapters: VoiceAdapters = {};
let activeRecognition: SpeechRecognitionLike | null = null;
let silenceTimer: ReturnType<typeof setTimeout> | null = null;
let speakingUtterance: SpeechSynthesisUtterance | null = null;
let speakHardStop: ReturnType<typeof setTimeout> | null = null;

export function setVoiceAdapters(next: VoiceAdapters) {
  adapters = next || {};
}

export function resetVoiceAdapters() {
  adapters = {};
  stopListening();
  stopSpeaking();
}

export function voiceModeStorageKey(userId?: string | null) {
  return `${VOICE_MODE_KEY_PREFIX}${userId || "anon"}`;
}

export function getVoiceMode(userId?: string | null): boolean {
  try {
    return localStorage.getItem(voiceModeStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function setVoiceMode(userId: string | null | undefined, on: boolean) {
  try {
    localStorage.setItem(voiceModeStorageKey(userId), on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function isOnline(): boolean {
  if (adapters.isOnline) return adapters.isOnline();
  try {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
  } catch {
    return true;
  }
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (adapters.getSpeechRecognition) return adapters.getSpeechRecognition();
  try {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  } catch {
    return null;
  }
}

export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (adapters.getSpeechSynthesis) return adapters.getSpeechSynthesis();
  try {
    return typeof window !== "undefined" && window.speechSynthesis
      ? window.speechSynthesis
      : null;
  } catch {
    return null;
  }
}

export function isSttAvailable(): boolean {
  if (adapters.nativeStt || shouldUseNativeMediaBridge()) return true;
  return Boolean(getSpeechRecognitionCtor());
}

export function isTtsAvailable(): boolean {
  if (adapters.nativeSpeak || shouldUseNativeMediaBridge()) return true;
  return Boolean(getSpeechSynthesis());
}

export async function probeMicPermission(): Promise<MicPermission> {
  try {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (perms?.query) {
      const status = await perms.query({
        name: "microphone" as PermissionName,
      });
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      return "prompt";
    }
  } catch {
    /* fall through */
  }
  return "prompt";
}

export async function requestMicPermission(): Promise<MicPermission> {
  const getUserMedia =
    adapters.getUserMedia ||
    (navigator.mediaDevices?.getUserMedia
      ? (c: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(c)
      : null);

  if (!getUserMedia) return "unsupported";

  try {
    const stream = await getUserMedia({ audio: true });
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    return "granted";
  } catch (err) {
    const name = (err as { name?: string })?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "denied";
    }
    return "denied";
  }
}

function clearSilenceTimer() {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}

export function stopListening() {
  clearSilenceTimer();
  const rec = activeRecognition;
  activeRecognition = null;
  if (!rec) return;
  try {
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    rec.onspeechend = null;
    rec.stop();
  } catch {
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
  }
}

function plainTextForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~#>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cap spoken length: ~12 chars/sec ≈ 360 chars in 30s. */
export function truncateForTts(text: string, maxMs = MAX_TTS_MS): string {
  const plain = plainTextForSpeech(text);
  const maxChars = Math.max(40, Math.floor((maxMs / 1000) * 12));
  if (plain.length <= maxChars) return plain;
  const cut = plain.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function stopSpeaking() {
  if (speakHardStop) {
    clearTimeout(speakHardStop);
    speakHardStop = null;
  }
  speakingUtterance = null;
  try {
    adapters.nativeStopSpeak?.();
  } catch {
    /* ignore */
  }
  try {
    stopNativeSpeaking();
  } catch {
    /* ignore */
  }
  const synth = getSpeechSynthesis();
  try {
    synth?.cancel();
  } catch {
    /* ignore */
  }
}

export async function speakText(text: string): Promise<void> {
  const clipped = truncateForTts(text);
  if (!clipped) return;

  stopSpeaking();

  if (adapters.nativeSpeak) {
    await adapters.nativeSpeak(clipped);
    return;
  }

  if (shouldUseNativeMediaBridge()) {
    try {
      await speakNativeText(clipped);
      return;
    } catch {
      /* fall through to web */
    }
  }

  const synth = getSpeechSynthesis();
  if (!synth) return;

  await new Promise<void>((resolve) => {
    const utter = new SpeechSynthesisUtterance(clipped);
    speakingUtterance = utter;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (speakHardStop) {
        clearTimeout(speakHardStop);
        speakHardStop = null;
      }
      if (speakingUtterance === utter) speakingUtterance = null;
      resolve();
    };
    utter.onend = finish;
    utter.onerror = finish;
    speakHardStop = setTimeout(() => {
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
      finish();
    }, MAX_TTS_MS);
    try {
      synth.speak(utter);
    } catch {
      finish();
    }
  });
}

export async function listenOnce(): Promise<SttResult> {
  if (!isOnline()) return { status: "offline" };

  stopSpeaking();
  stopListening();

  if (adapters.nativeStt) {
    return adapters.nativeStt();
  }

  if (shouldUseNativeMediaBridge() && !getSpeechRecognitionCtor()) {
    try {
      return await startNativeSpeechRecognition();
    } catch {
      return {
        status: "unavailable",
        message: "Voice input isn’t available on this build yet — type instead.",
      };
    }
  }

  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    if (isNativeHost()) {
      try {
        return await startNativeSpeechRecognition();
      } catch {
        /* fall through */
      }
    }
    return {
      status: "unavailable",
      message: "Voice input isn’t available here — type instead.",
    };
  }

  const permission = await requestMicPermission();
  if (permission === "denied") return { status: "denied" };
  if (permission === "unsupported") {
    return { status: "unavailable", message: STT_FAIL_COPY };
  }

  return new Promise<SttResult>((resolve) => {
    let finalText = "";
    let settled = false;
    const finish = (result: SttResult) => {
      if (settled) return;
      settled = true;
      clearSilenceTimer();
      activeRecognition = null;
      resolve(result);
    };

    try {
      const rec = new Ctor();
      activeRecognition = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      const bumpSilence = () => {
        clearSilenceTimer();
        silenceTimer = setTimeout(() => {
          try {
            rec.stop();
          } catch {
            /* ignore */
          }
        }, SILENCE_MS);
      };

      rec.onresult = (ev) => {
        let interim = "";
        for (let i = 0; i < ev.results.length; i++) {
          const row = ev.results[i];
          const piece = row?.[0]?.transcript || "";
          if ((row as { isFinal?: boolean }).isFinal) {
            finalText = `${finalText} ${piece}`.trim();
          } else {
            interim = `${interim} ${piece}`.trim();
          }
        }
        void interim;
        bumpSilence();
      };

      rec.onerror = (ev) => {
        const code = ev?.error || "";
        if (code === "not-allowed" || code === "service-not-allowed") {
          finish({ status: "denied" });
          return;
        }
        if (code === "no-speech") {
          finish({ status: "empty" });
          return;
        }
        finish({ status: "error", message: STT_FAIL_COPY });
      };

      rec.onend = () => {
        const text = finalText.trim();
        if (text) finish({ status: "ok", text });
        else finish({ status: "empty" });
      };

      rec.onspeechend = () => bumpSilence();
      bumpSilence();
      rec.start();
    } catch {
      finish({ status: "error", message: STT_FAIL_COPY });
    }
  });
}
