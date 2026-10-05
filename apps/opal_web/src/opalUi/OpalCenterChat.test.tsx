/**
 * Phase OC-1 / OC-6 — Opal Center conversational shell FE tests.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpalCenterChat } from "./OpalCenterChat";
import type { OpalChatConversation, OpalChatMessage } from "../api/productClient";
import {
  MIC_BLOCKED_COPY,
  resetVoiceAdapters,
  setVoiceAdapters,
  setVoiceMode as persistVoiceMode,
} from "./opalCenterVoice";

/** Sample Opal reply for hydrate/TTS tests — must not be the banned OC-1 placeholder. */
const sampleOpalReply = "Hey. What's on your mind?";

const getOpalConversation = vi.fn();
const postOpalMessage = vi.fn();
const speakTextMock = vi.fn(async () => undefined);
const listenOnceMock = vi.fn();
const probeMicPermissionMock = vi.fn(async () => "prompt" as const);
const stopSpeakingMock = vi.fn();
const stopListeningMock = vi.fn();

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    getOpalConversation: (...args: unknown[]) => getOpalConversation(...args),
    postOpalMessage: (...args: unknown[]) => postOpalMessage(...(args as [string])),
  };
});

vi.mock("./opalCenterVoice", async () => {
  const actual = await vi.importActual<typeof import("./opalCenterVoice")>(
    "./opalCenterVoice",
  );
  return {
    ...actual,
    speakText: (...args: unknown[]) => speakTextMock(...(args as [string])),
    listenOnce: (...args: unknown[]) => listenOnceMock(...args),
    probeMicPermission: (...args: unknown[]) => probeMicPermissionMock(...args),
    stopSpeaking: (...args: unknown[]) => stopSpeakingMock(...args),
    stopListening: (...args: unknown[]) => stopListeningMock(...args),
    isSttAvailable: () => true,
    isOnline: () => actual.isOnline(),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setTextarea(el: HTMLTextAreaElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function emptyConv(): OpalChatConversation {
  return {
    id: "conv-1",
    user_id: "u-a",
    title: null,
    messages: [],
  };
}

function msg(partial: Partial<OpalChatMessage> & Pick<OpalChatMessage, "id" | "role" | "body">): OpalChatMessage {
  return {
    conversation_id: "conv-1",
    inserted_at: new Date().toISOString(),
    metadata: null,
    ...partial,
  };
}

beforeEach(() => {
  localStorage.clear();
  resetVoiceAdapters();
  setVoiceAdapters({ isOnline: () => true });
  getOpalConversation.mockReset().mockResolvedValue({ conversation: emptyConv() });
  postOpalMessage.mockReset().mockResolvedValue({
    messages: [
      msg({ id: "m1", role: "user", body: "hello" }),
      msg({ id: "m2", role: "opal", body: sampleOpalReply }),
    ],
  });
  speakTextMock.mockReset().mockResolvedValue(undefined);
  listenOnceMock.mockReset().mockResolvedValue({ status: "ok", text: "dinner friday" });
  probeMicPermissionMock.mockReset().mockResolvedValue("prompt");
  stopSpeakingMock.mockReset();
  stopListeningMock.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  resetVoiceAdapters();
  localStorage.clear();
});

describe("OpalCenterChat", () => {
  it("renders empty state + suggestion chips", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="opal-center-chat-empty"]')?.textContent).toContain(
      "Say hello to Opal",
    );
    expect(container.textContent).toContain("Plan something");
    expect(container.textContent).toContain("Remember something");
    expect(container.textContent).toContain("What's coming up?");
    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    expect(input?.placeholder).toBe("Talk to Opal…");
  });

  it("sends message and shows user + Opal bubbles", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    await act(async () => {
      setTextarea(input, "hello");
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-send"]')?.click();
    });
    await flush();
    await flush();

    expect(postOpalMessage).toHaveBeenCalledWith("hello", undefined);
    const user = container.querySelectorAll('[data-testid="opal-center-chat-user-msg"]');
    const opal = container.querySelectorAll('[data-testid="opal-center-chat-opal-msg"]');
    expect(user.length).toBeGreaterThanOrEqual(1);
    expect(opal.length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain(sampleOpalReply);
  });

  it("chip tap sends that text", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-chip-Plan something"]')
        ?.click();
    });
    await flush();
    await flush();

    expect(postOpalMessage).toHaveBeenCalledWith("Plan something", undefined);
  });

  it("shows load error with retry", async () => {
    getOpalConversation.mockRejectedValueOnce(new Error("fail"));
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat-load-error"]')?.textContent).toContain(
      "Couldn't load conversation",
    );
    getOpalConversation.mockResolvedValueOnce({ conversation: emptyConv() });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-retry-load"]')?.click();
    });
    await flush();
    expect(container.querySelector('[data-testid="opal-center-chat-empty"]')).toBeTruthy();
  });

  it("shows send error and keeps typed text on failure", async () => {
    postOpalMessage.mockRejectedValueOnce(new Error("fail"));
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    await act(async () => {
      setTextarea(input, " salvage me ");
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-send"]')?.click();
    });
    await flush();
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat-send-error"]')?.textContent).toContain(
      "Couldn't send — tap to retry",
    );
    const after = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    expect(after.value).toMatch(/salvage me/);
  });

  it("renders history messages on load", async () => {
    getOpalConversation.mockResolvedValueOnce({
      conversation: {
        id: "conv-1",
        user_id: "u-a",
        title: "hello",
        messages: [
          msg({ id: "h1", role: "user", body: "hello" }),
          msg({ id: "h2", role: "opal", body: sampleOpalReply }),
        ],
      },
    });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat-empty"]')).toBeNull();
    expect(container.querySelectorAll('[data-testid="opal-center-chat-user-msg"]').length).toBe(1);
    expect(container.querySelectorAll('[data-testid="opal-center-chat-opal-msg"]').length).toBe(1);
  });

  it("renders mic button and voice-mode toggle in composer/header", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} userId="u-a" />);
    });
    await flush();

    expect(container.querySelector('[data-testid="opal-center-chat-mic"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="opal-center-chat-voice-toggle"]')).toBeTruthy();
    const toggle = container.querySelector(
      '[data-testid="opal-center-chat-voice-toggle"]',
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("tapping mic runs STT and puts transcribed text in input (editable)", async () => {
    listenOnceMock.mockResolvedValueOnce({ status: "ok", text: "dinner friday" });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} userId="u-a" />);
    });
    await flush();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-mic"]')?.click();
    });
    await flush();
    await flush();

    expect(listenOnceMock).toHaveBeenCalled();
    expect(stopSpeakingMock).toHaveBeenCalled();
    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    expect(input.value).toBe("dinner friday");
    expect(postOpalMessage).not.toHaveBeenCalled();
  });

  it("send flow works with voice-transcribed text (same as typed)", async () => {
    listenOnceMock.mockResolvedValueOnce({ status: "ok", text: "dinner friday" });
    postOpalMessage.mockResolvedValueOnce({
      messages: [
        msg({ id: "m1", role: "user", body: "dinner friday" }),
        msg({ id: "m2", role: "opal", body: sampleOpalReply }),
      ],
    });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} userId="u-a" />);
    });
    await flush();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-mic"]')?.click();
    });
    await flush();
    await flush();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-send"]')?.click();
    });
    await flush();
    await flush();

    expect(postOpalMessage).toHaveBeenCalledWith("dinner friday", undefined);
  });

  it("TTS speaks on new Opal response when voice mode ON", async () => {
    persistVoiceMode("u-a", true);
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} userId="u-a" />);
    });
    await flush();

    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    await act(async () => {
      setTextarea(input, "hello");
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-send"]')?.click();
    });
    await flush();
    await flush();

    expect(speakTextMock).toHaveBeenCalledWith(sampleOpalReply);
  });

  it("TTS does NOT speak when voice mode OFF", async () => {
    persistVoiceMode("u-a", false);
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} userId="u-a" />);
    });
    await flush();

    const input = container.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    await act(async () => {
      setTextarea(input, "hello");
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="opal-center-chat-send"]')?.click();
    });
    await flush();
    await flush();

    expect(speakTextMock).not.toHaveBeenCalled();
  });

  it("permission denied shows Settings prompt after real STT denial (not probe)", async () => {
    // Probe may say denied on iOS — we must still attempt listenOnce.
    probeMicPermissionMock.mockResolvedValue("denied");
    listenOnceMock.mockResolvedValueOnce({ status: "denied" });
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} userId="u-a" />);
    });
    await flush();
    await flush();

    const mic = container.querySelector(
      '[data-testid="opal-center-chat-mic"]',
    ) as HTMLButtonElement;

    await act(async () => {
      mic.click();
    });
    await flush();
    await flush();

    expect(listenOnceMock).toHaveBeenCalled();
    expect(
      container.querySelector('[data-testid="opal-center-chat-voice-hint"]')?.textContent,
    ).toBe(MIC_BLOCKED_COPY);
  });

  it("voice toggle persists preference and stops speaking when turned off", async () => {
    await act(async () => {
      root.render(<OpalCenterChat onBack={() => undefined} userId="u-a" />);
    });
    await flush();

    const toggle = container.querySelector(
      '[data-testid="opal-center-chat-voice-toggle"]',
    ) as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    await flush();
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("opal_center_voice_mode:u-a")).toBe("1");

    await act(async () => {
      toggle.click();
    });
    await flush();
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(stopSpeakingMock).toHaveBeenCalled();
  });
});
