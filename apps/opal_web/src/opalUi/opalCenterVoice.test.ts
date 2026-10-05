/**
 * Phase OC-6 — native STT/TTS helpers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LISTENING_COPY,
  MAX_TTS_MS,
  MIC_BLOCKED_COPY,
  STT_FAIL_COPY,
  VOICE_OFFLINE_COPY,
  getVoiceMode,
  listenOnce,
  resetVoiceAdapters,
  setVoiceAdapters,
  setVoiceMode,
  speakText,
  stopSpeaking,
  truncateForTts,
  voiceModeStorageKey,
} from "./opalCenterVoice";

describe("opalCenterVoice", () => {
  beforeEach(() => {
    resetVoiceAdapters();
    localStorage.clear();
  });

  afterEach(() => {
    resetVoiceAdapters();
    localStorage.clear();
  });

  it("persists voice mode per user in localStorage (default off)", () => {
    expect(getVoiceMode("u1")).toBe(false);
    setVoiceMode("u1", true);
    expect(getVoiceMode("u1")).toBe(true);
    expect(localStorage.getItem(voiceModeStorageKey("u1"))).toBe("1");
    expect(getVoiceMode("u2")).toBe(false);
    setVoiceMode("u1", false);
    expect(getVoiceMode("u1")).toBe(false);
  });

  it("exports copy constants for UI", () => {
    expect(MIC_BLOCKED_COPY).toMatch(/Settings/);
    expect(VOICE_OFFLINE_COPY).toMatch(/internet/i);
    expect(STT_FAIL_COPY).toMatch(/didn't catch/i);
    expect(LISTENING_COPY).toBe("Listening…");
    expect(MAX_TTS_MS).toBe(30_000);
  });

  it("truncates TTS to ~30s plain text and strips formatting", () => {
    const short = truncateForTts("Hello **world** — `code`");
    expect(short).toBe("Hello world — code");
    const long = "word ".repeat(500);
    const clipped = truncateForTts(long);
    expect(clipped.length).toBeLessThan(long.length);
    expect(clipped.endsWith("…")).toBe(true);
    expect(clipped.length).toBeLessThanOrEqual(Math.floor(30 * 12) + 2);
  });

  it("listenOnce returns offline when offline", async () => {
    setVoiceAdapters({ isOnline: () => false });
    await expect(listenOnce()).resolves.toEqual({ status: "offline" });
  });

  it("listenOnce uses adapter nativeStt (mock returns dinner friday)", async () => {
    setVoiceAdapters({
      isOnline: () => true,
      nativeStt: async () => ({ status: "ok", text: "dinner friday" }),
    });
    await expect(listenOnce()).resolves.toEqual({
      status: "ok",
      text: "dinner friday",
    });
  });

  it("listenOnce maps denied from adapter", async () => {
    setVoiceAdapters({
      isOnline: () => true,
      nativeStt: async () => ({ status: "denied" }),
    });
    await expect(listenOnce()).resolves.toEqual({ status: "denied" });
  });

  it("listenOnce maps empty / no speech", async () => {
    setVoiceAdapters({
      isOnline: () => true,
      nativeStt: async () => ({ status: "empty" }),
    });
    await expect(listenOnce()).resolves.toEqual({ status: "empty" });
  });

  it("speakText calls nativeSpeak adapter with truncated plain text", async () => {
    const nativeSpeak = vi.fn(async () => undefined);
    setVoiceAdapters({ nativeSpeak });
    await speakText("**Hello** world");
    expect(nativeSpeak).toHaveBeenCalledWith("Hello world");
  });

  it("speakText no-ops on empty / whitespace", async () => {
    const nativeSpeak = vi.fn(async () => undefined);
    setVoiceAdapters({ nativeSpeak });
    await speakText("   ");
    expect(nativeSpeak).not.toHaveBeenCalled();
  });

  it("stopSpeaking invokes nativeStopSpeak", () => {
    const nativeStopSpeak = vi.fn();
    setVoiceAdapters({ nativeStopSpeak });
    stopSpeaking();
    expect(nativeStopSpeak).toHaveBeenCalled();
  });

  it("Web Speech Recognition path resolves final transcript", async () => {
    type Rec = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((ev: unknown) => void) | null;
      onerror: ((ev: unknown) => void) | null;
      onend: (() => void) | null;
      onspeechend: (() => void) | null;
      start: () => void;
      stop: () => void;
      abort: () => void;
    };
    let instance: Rec | null = null;
    class FakeRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: Rec["onresult"] = null;
      onerror: Rec["onerror"] = null;
      onend: Rec["onend"] = null;
      onspeechend: Rec["onspeechend"] = null;
      start() {
        instance = this;
        queueMicrotask(() => {
          this.onresult?.({
            results: [
              Object.assign([{ transcript: "plan dinner friday" }], {
                isFinal: true,
              }),
            ],
          });
          this.onend?.();
        });
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }

    setVoiceAdapters({
      isOnline: () => true,
      getUserMedia: async () =>
        ({
          getTracks: () => [{ stop: () => undefined }],
        }) as unknown as MediaStream,
      getSpeechRecognition: () => FakeRecognition as unknown as new () => Rec,
    });

    const result = await listenOnce();
    expect(result).toEqual({ status: "ok", text: "plan dinner friday" });
    expect(instance).toBeTruthy();
  });

  it("iOS-like clients skip getUserMedia preflight and start Web Speech", async () => {
    const getUserMedia = vi.fn(async () => {
      throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
    });
    class FakeRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((ev: unknown) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onspeechend: (() => void) | null = null;
      start() {
        queueMicrotask(() => {
          this.onresult?.({
            results: [
              Object.assign([{ transcript: "hello" }], { isFinal: true }),
            ],
          });
          this.onend?.();
        });
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    // Force non-native desktop UA path would call getUserMedia; with iOS UA it skips.
    const orig = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    setVoiceAdapters({
      isOnline: () => true,
      getUserMedia,
      getSpeechRecognition: () => FakeRecognition as unknown as new () => FakeRecognition,
    });
    await expect(listenOnce()).resolves.toEqual({ status: "ok", text: "hello" });
    expect(getUserMedia).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => orig,
    });
  });

  it("probeMicPermission never returns denied on iOS-like clients", async () => {
    const orig = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const { probeMicPermission } = await import("./opalCenterVoice");
    await expect(probeMicPermission()).resolves.toBe("prompt");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => orig,
    });
  });
});
