/**
 * Phase OC-6 / P0 Fix 1 — native STT/TTS via Expo Speech Recognition + expo-speech.
 * Lazy-require so missing native modules degrade honestly (pre-rebuild).
 */
import {
  SPEECH_ERROR_OUTBOUND_TYPE,
  SPEECH_RESULT_OUTBOUND_TYPE,
  SPEECH_TTS_DONE_OUTBOUND_TYPE,
  type SpeechOutboundMessage,
} from "./mediaBridgeContract";

const SILENCE_MS = 3500;
const MAX_LISTEN_MS = 20_000;

type SpeechModule = {
  requestPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  getPermissionsAsync?: () => Promise<{ granted?: boolean; status?: string }>;
  start: (opts: {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
  }) => void;
  stop: () => void;
  abort?: () => void;
  addListener: (
    event: string,
    cb: (payload: Record<string, unknown>) => void,
  ) => { remove: () => void };
  isRecognitionAvailable?: () => boolean;
};

type ExpoSpeechModule = {
  speak: (
    text: string,
    opts?: {
      language?: string;
      onDone?: () => void;
      onStopped?: () => void;
      onError?: () => void;
    },
  ) => void;
  stop: () => void;
};

function loadSpeechRecognition(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule?: SpeechModule;
    };
    return mod.ExpoSpeechRecognitionModule || null;
  } catch {
    return null;
  }
}

function loadExpoSpeech(): ExpoSpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech") as ExpoSpeechModule;
  } catch {
    return null;
  }
}

function nativeModuleMissing(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || "");
  return /Cannot find native module|Native module|not found|ExpoSpeechRecognition/i.test(
    msg,
  );
}

/**
 * Run one-shot speech recognition and return an outbound bridge message.
 */
export async function acquireNativeSpeech(
  request_id: string,
): Promise<SpeechOutboundMessage> {
  const Speech = loadSpeechRecognition();
  if (!Speech) {
    return {
      type: SPEECH_ERROR_OUTBOUND_TYPE,
      request_id,
      code: "unavailable",
      message:
        "Voice input needs a native rebuild with speech recognition. Open in Safari on this phone for now, or rebuild the app.",
    };
  }

  try {
    if (typeof Speech.isRecognitionAvailable === "function") {
      const ok = Speech.isRecognitionAvailable();
      if (ok === false) {
        return {
          type: SPEECH_ERROR_OUTBOUND_TYPE,
          request_id,
          code: "unavailable",
          message: "Speech recognition isn’t available on this device.",
        };
      }
    }

    const perm = await Speech.requestPermissionsAsync();
    if (!perm?.granted) {
      return {
        type: SPEECH_ERROR_OUTBOUND_TYPE,
        request_id,
        code: "denied",
        message:
          "Microphone access is blocked. Enable it in Settings to talk to Opal.",
      };
    }

    return await new Promise<SpeechOutboundMessage>((resolve) => {
      let finalText = "";
      let settled = false;
      const subs: Array<{ remove: () => void }> = [];

      const finish = (msg: SpeechOutboundMessage) => {
        if (settled) return;
        settled = true;
        try {
          clearTimeout(hard);
          clearTimeout(silence);
        } catch {
          /* ignore */
        }
        for (const s of subs) {
          try {
            s.remove();
          } catch {
            /* ignore */
          }
        }
        try {
          Speech.stop();
        } catch {
          /* ignore */
        }
        resolve(msg);
      };

      const bumpSilence = () => {
        clearTimeout(silence);
        silence = setTimeout(() => {
          try {
            Speech.stop();
          } catch {
            /* ignore */
          }
        }, SILENCE_MS);
      };

      let silence: ReturnType<typeof setTimeout> = setTimeout(() => undefined, 0);
      clearTimeout(silence);

      subs.push(
        Speech.addListener("result", (ev) => {
          try {
            const results = (ev.results as Array<{ transcript?: string }>) || [];
            const isFinal = Boolean(ev.isFinal);
            const piece = results[0]?.transcript || "";
            if (isFinal && piece) {
              finalText = `${finalText} ${piece}`.trim();
            } else if (piece && !finalText) {
              // Keep latest interim as fallback if end fires without final.
              finalText = piece.trim();
            }
            bumpSilence();
          } catch {
            /* ignore */
          }
        }),
      );

      subs.push(
        Speech.addListener("error", (ev) => {
          const code = String(ev.error || "");
          if (code === "not-allowed" || code === "service-not-allowed") {
            finish({
              type: SPEECH_ERROR_OUTBOUND_TYPE,
              request_id,
              code: "denied",
              message:
                "Microphone access is blocked. Enable it in Settings to talk to Opal.",
            });
            return;
          }
          if (code === "no-speech") {
            finish({
              type: SPEECH_ERROR_OUTBOUND_TYPE,
              request_id,
              code: "empty",
              message: "I didn't catch that. Try again or type instead.",
            });
            return;
          }
          finish({
            type: SPEECH_ERROR_OUTBOUND_TYPE,
            request_id,
            code: "error",
            message: "I didn't catch that. Try again or type instead.",
          });
        }),
      );

      subs.push(
        Speech.addListener("end", () => {
          const text = finalText.trim();
          if (text) {
            finish({
              type: SPEECH_RESULT_OUTBOUND_TYPE,
              request_id,
              text,
            });
          } else {
            finish({
              type: SPEECH_ERROR_OUTBOUND_TYPE,
              request_id,
              code: "empty",
              message: "I didn't catch that. Try again or type instead.",
            });
          }
        }),
      );

      const hard = setTimeout(() => {
        try {
          Speech.stop();
        } catch {
          /* ignore */
        }
      }, MAX_LISTEN_MS);

      bumpSilence();
      Speech.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
      });
    });
  } catch (err) {
    if (nativeModuleMissing(err)) {
      return {
        type: SPEECH_ERROR_OUTBOUND_TYPE,
        request_id,
        code: "unavailable",
        message:
          "Voice input needs a native rebuild with speech recognition. Open in Safari on this phone for now, or rebuild the app.",
      };
    }
    return {
      type: SPEECH_ERROR_OUTBOUND_TYPE,
      request_id,
      code: "error",
      message: "I didn't catch that. Try again or type instead.",
    };
  }
}

export type NativeSpeakResult =
  | { via: "expo-speech"; message: SpeechOutboundMessage }
  | { via: "fallback"; message: SpeechOutboundMessage };

/** Speak via expo-speech; returns fallback when module missing so WebView TTS can run. */
export async function speakNativeUtterance(
  request_id: string,
  text: string,
): Promise<NativeSpeakResult> {
  const Speech = loadExpoSpeech();
  const clipped = String(text || "").trim().slice(0, 800);
  const doneMsg: SpeechOutboundMessage = {
    type: SPEECH_TTS_DONE_OUTBOUND_TYPE,
    request_id,
  };
  if (!clipped) return { via: "expo-speech", message: doneMsg };
  if (!Speech) return { via: "fallback", message: doneMsg };

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(hard);
      resolve({ via: "expo-speech", message: doneMsg });
    };
    const hard = setTimeout(() => {
      try {
        Speech.stop();
      } catch {
        /* ignore */
      }
      done();
    }, 30_000);
    try {
      Speech.speak(clipped, {
        language: "en-US",
        onDone: done,
        onStopped: done,
        onError: done,
      });
    } catch {
      resolve({ via: "fallback", message: doneMsg });
    }
  });
}

export function stopNativeUtterance(): void {
  try {
    loadExpoSpeech()?.stop();
  } catch {
    /* ignore */
  }
  try {
    loadSpeechRecognition()?.abort?.();
    loadSpeechRecognition()?.stop();
  } catch {
    /* ignore */
  }
}
