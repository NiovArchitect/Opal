/**
 * @vitest-environment jsdom
 *
 * Repair #20, F-2 — composer furniture pins.
 *
 * Founder review (2026-10-20): the thread composer exposed a bare
 * text artifact reading "Record a voice note" (the ST-H control
 * rendered as a c2s-btn-text), and the send control only popped
 * into existence after typing. The fix:
 *  - the voice-note control is a circular MIC ICON button (the
 *    name lives in aria-label/title; the same real record ->
 *    review -> sendVoiceNote path underneath), stop is an icon
 *    button, and review's send/discard are boxed pills;
 *  - thread AND Opal chat (CenterChat) composers carry a permanent
 *    send icon button that is disabled/quiet while the draft is
 *    empty and ACTIVATES with text;
 *  - NO attach button is painted anywhere: thread messages have
 *    no media carrier (no message-media model, no conversation
 *    upload route, sendMessage is text-only) - attach stays
 *    honestly absent, and this pin guards against painting one.
 *
 * On the base build the icon/activation pins fail (bare text
 * button, no send at rest); here they pass.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendVoiceNote = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    sendVoiceNote: (...a: unknown[]) => sendVoiceNote(...a),
  };
});

import { VoiceNoteControl } from "./adopt3";
import { CenterChat, ThreadShell } from "../../opalUi/c1/C1Surfaces";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function stubRecorder() {
  const stream = { getTracks: () => [{ stop: vi.fn() }] };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  class FakeRecorder {
    mimeType = "audio/webm";
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {}
    stop() {
      this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: "audio/webm" }) });
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:review" });
}

beforeEach(() => {
  sendVoiceNote.mockReset();
});

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
  }
  host?.remove();
  host = null;
  root = null;
  vi.unstubAllGlobals();
});

describe("R20 F-2 - the voice-note control is a mic icon button, not bare text", () => {
  it("idle: a circular icon button whose only text is its accessible name", async () => {
    stubRecorder();
    await render(<VoiceNoteControl conversationId="conv-1" bearer="tok" onSent={() => {}} />);
    const btn = host!.querySelector('[data-testid="c2-voice-record"]');
    expect(btn).not.toBeNull();
    expect(btn!.tagName).toBe("BUTTON");
    expect(btn!.className).toContain("c2s-voice-mic");
    // No visible text artifact: the label is the accessible name only.
    expect(btn!.textContent?.trim()).toBe("");
    expect(btn!.querySelector("svg")).not.toBeNull();
    expect(btn!.getAttribute("aria-label")).toBe("Record a voice note");
    expect(host!.textContent).not.toContain("Record a voice note");
  });

  it("the real path still works: record -> stop icon -> review -> boxed send -> sendVoiceNote", async () => {
    stubRecorder();
    sendVoiceNote.mockResolvedValue({
      message: { id: "vn-9" },
      transcript: null,
      transcription_state: "none",
      origin: "created",
    });
    const onSent = vi.fn();
    await render(<VoiceNoteControl conversationId="conv-1" bearer="tok" onSent={onSent} />);
    await click(host!.querySelector('[data-testid="c2-voice-record"]')!);
    expect(host!.querySelector('[data-testid="c2-voice-recording"]')?.textContent).toContain(
      "Recording",
    );
    const stop = host!.querySelector('[data-testid="c2-voice-stop"]')!;
    expect(stop.getAttribute("aria-label")).toBe("Stop recording");
    expect(stop.textContent?.trim()).toBe("");
    await click(stop);
    expect(host!.querySelector('[data-testid="c2-voice-review-player"]')).not.toBeNull();
    const send = host!.querySelector('[data-testid="c2-voice-send"]')!;
    expect(send.className).toContain("c2s-voice-action");
    await click(send);
    expect(sendVoiceNote).toHaveBeenCalledTimes(1);
    expect(onSent).toHaveBeenCalled();
  });

  it("the mic/stop/action styles are real furniture (44px circle, boxed pills)", () => {
    const css = readFileSync(resolve(__dirname, "./c2shell.css"), "utf8");
    const mic = css.match(/\.c2s-voice-mic[^{]*\{([^}]*)\}/);
    expect(mic).not.toBeNull();
    expect(mic![1]).toMatch(/width:\s*44px/);
    expect(mic![1]).toMatch(/border-radius:\s*50%/);
    expect(mic![1]).toMatch(/border:\s*1px solid/);
    expect(css).toMatch(/\.c2s-voice-mic:active/);
    const action = css.match(/\.c2s-voice-action\s*\{([^}]*)\}/);
    expect(action).not.toBeNull();
    expect(action![1]).toMatch(/border:\s*1px solid/);
    expect(action![1]).toMatch(/border-radius:\s*999px/);
  });
});

describe("R20 F-2 - composer send: permanent furniture that activates with text", () => {
  it("thread composer: disabled at rest, activates with text, sends and clears", async () => {
    const onSend = vi.fn();
    await render(
      <ThreadShell
        name="Maya"
        initials="M"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
        onSend={onSend}
      />,
    );
    const send = host!.querySelector<HTMLButtonElement>('[data-testid="thread-composer-send"]');
    expect(send).not.toBeNull();
    expect(send!.disabled).toBe(true);
    expect(send!.className).not.toContain("is-active");
    expect(send!.getAttribute("aria-label")).toBe("Send");

    const input = host!.querySelector<HTMLInputElement>(".c1-composer-input")!;
    await act(async () => {
      typeInto(input, "See you at seven");
    });
    const active = host!.querySelector<HTMLButtonElement>('[data-testid="thread-composer-send"]')!;
    expect(active.disabled).toBe(false);
    expect(active.className).toContain("is-active");

    await click(active);
    expect(onSend).toHaveBeenCalledWith("See you at seven");
    const after = host!.querySelector<HTMLButtonElement>('[data-testid="thread-composer-send"]')!;
    expect(after.disabled).toBe(true);
  });

  it("thread composer with no send path renders no send button (read-only stays honest)", async () => {
    await render(
      <ThreadShell
        name="Maya"
        initials="M"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
      />,
    );
    expect(host!.querySelector('[data-testid="thread-composer-send"]')).toBeNull();
  });

  it("Opal chat composer: the same send furniture and activation", async () => {
    const onSend = vi.fn();
    await render(
      <CenterChat
        title="Opal"
        messages={[]}
        plansById={new Map()}
        onSend={onSend}
      />,
    );
    const send = host!.querySelector<HTMLButtonElement>('[data-testid="opal-chat-composer-send"]');
    expect(send).not.toBeNull();
    expect(send!.disabled).toBe(true);
    const input = host!.querySelector<HTMLInputElement>(".c1-composer-input")!;
    await act(async () => {
      typeInto(input, "Plan dinner Saturday");
    });
    const active = host!.querySelector<HTMLButtonElement>('[data-testid="opal-chat-composer-send"]')!;
    expect(active.disabled).toBe(false);
    expect(active.className).toContain("is-active");
    await click(active);
    expect(onSend).toHaveBeenCalledWith("Plan dinner Saturday");
  });

  it("no attach control is painted in either composer (honestly absent - no media carrier)", async () => {
    await render(
      <ThreadShell
        name="Maya"
        initials="M"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
        onSend={() => {}}
      />,
    );
    const bar = host!.querySelector(".c1-composer-bar")!;
    expect(bar.querySelector('[data-testid*="attach" i]')).toBeNull();
    expect(bar.querySelector('[aria-label*="ttach" i]')).toBeNull();
  });

  it("the disabled send state is styled quiet in c1.css (no accent spent on an empty draft)", () => {
    const css = readFileSync(resolve(__dirname, "../../opalUi/c1/c1.css"), "utf8");
    const disabled = css.match(/\.c1-send:disabled\s*\{([^}]*)\}/);
    expect(disabled).not.toBeNull();
    expect(disabled![1]).toMatch(/background:\s*var\(--surface-2\)/);
    expect(disabled![1]).toMatch(/cursor:\s*default/);
  });
});
