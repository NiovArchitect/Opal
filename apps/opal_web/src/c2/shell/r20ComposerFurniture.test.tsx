/**
 * @vitest-environment jsdom
 *
 * Repair #20, F-2 - composer furniture pins, amended by Repair
 * #20A to the founder's SETTLED composer model (2026-10-20
 * 08:09-08:10 PDT):
 *  - the mic lives INSIDE the composer, in its action slot;
 *  - composer EMPTY = the slot shows the MIC (tap or long-press
 *    records; the recording state renders INSIDE the composer
 *    bar);
 *  - text PRESENT = the slot becomes SEND;
 *  - NOTHING floats outside the composer except a pop-up anchored
 *    to a proper in-composer control (the voice review pop-up
 *    anchors to the in-slot voice control) - no external mic
 *    button, and no layout shift: the bar's footprint is stable
 *    across empty / text / recording states (the same bar, pill,
 *    and slot containers in every state).
 *
 * F-2 pins that stand unchanged: the voice-note control is a
 * circular MIC ICON button (never the bare "Record a voice note"
 * text artifact), the real record -> review -> sendVoiceNote
 * path, and NO attach button anywhere (thread messages have no
 * media carrier - attach stays honestly absent).
 *
 * Opal-chat divergence, declared and pinned: the Opal chat
 * (CenterChat) host wires NO voice path into that surface, so
 * its action slot renders NO mic while empty - it is reserved,
 * honestly empty space - and shows Send only when text is
 * present. A dead mic is never painted.
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

function threadWithVoice(extra: Record<string, unknown> = {}) {
  return (
    <ThreadShell
      name="Maya"
      initials="M"
      messages={[]}
      plansById={new Map()}
      composerPlaceholder="Message Maya"
      onSend={() => {}}
      composerAction={
        <VoiceNoteControl conversationId="conv-1" bearer="tok" onSent={() => {}} />
      }
      {...extra}
    />
  );
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

  it("the real path still works: record -> stop icon -> review pop-up -> boxed send -> sendVoiceNote", async () => {
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
    // Review is a pop-up anchored to the in-composer control: the
    // anchor button carries it, and the pop-up (player + actions)
    // is a descendant of the control's own root.
    const control = host!.querySelector('[data-testid="c2-voice-note-control"]')!;
    const anchor = host!.querySelector('[data-testid="c2-voice-review-anchor"]')!;
    expect(control.contains(anchor)).toBe(true);
    expect(anchor.getAttribute("aria-expanded")).toBe("true");
    const review = host!.querySelector('[data-testid="c2-voice-review"]')!;
    expect(review).not.toBeNull();
    expect(control.contains(review)).toBe(true);
    expect(review.querySelector('[data-testid="c2-voice-review-player"]')).not.toBeNull();
    const send = review.querySelector('[data-testid="c2-voice-send"]')!;
    expect(send.className).toContain("c2s-voice-action");
    await click(send);
    expect(sendVoiceNote).toHaveBeenCalledTimes(1);
    expect(onSent).toHaveBeenCalled();
  });

  it("the review pop-up toggles from its in-composer anchor", async () => {
    stubRecorder();
    await render(<VoiceNoteControl conversationId="conv-1" bearer="tok" onSent={() => {}} />);
    await click(host!.querySelector('[data-testid="c2-voice-record"]')!);
    await click(host!.querySelector('[data-testid="c2-voice-stop"]')!);
    expect(host!.querySelector('[data-testid="c2-voice-review"]')).not.toBeNull();
    await click(host!.querySelector('[data-testid="c2-voice-review-anchor"]')!);
    expect(host!.querySelector('[data-testid="c2-voice-review"]')).toBeNull();
    // The anchor itself stays in the slot - the note is not lost.
    expect(host!.querySelector('[data-testid="c2-voice-review-anchor"]')).not.toBeNull();
    await click(host!.querySelector('[data-testid="c2-voice-review-anchor"]')!);
    expect(host!.querySelector('[data-testid="c2-voice-review"]')).not.toBeNull();
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

  it("the review pop-up is anchored in CSS: absolute against the relative control root", () => {
    const css = readFileSync(resolve(__dirname, "./c2shell.css"), "utf8");
    const root = css.match(/\.c2s-voice-note\s*\{([^}]*)\}/);
    expect(root).not.toBeNull();
    expect(root![1]).toMatch(/position:\s*relative/);
    const review = css.match(/\.c2s-voice-review\s*\{([^}]*)\}/);
    expect(review).not.toBeNull();
    expect(review![1]).toMatch(/position:\s*absolute/);
    expect(review![1]).toMatch(/bottom:\s*calc\(100% \+ 10px\)/);
    expect(review![1]).toMatch(/right:\s*0/);
  });
});

describe("R20A settled model - the thread composer action slot", () => {
  it("empty: the mic renders INSIDE the composer pill, in the action slot - and nowhere else", async () => {
    stubRecorder();
    await render(threadWithVoice());
    const bar = host!.querySelector('[data-testid="thread-composer-bar"]')!;
    const pill = host!.querySelector('[data-testid="thread-composer"]')!;
    const slot = host!.querySelector('[data-testid="thread-composer-action-slot"]')!;
    expect(bar.contains(pill)).toBe(true);
    expect(pill.contains(slot)).toBe(true);
    const mic = host!.querySelector('[data-testid="c2-voice-record"]')!;
    expect(mic).not.toBeNull();
    expect(slot.contains(mic)).toBe(true);
    expect(pill.contains(mic)).toBe(true);
    // No composer-external mic control exists: every mic in the
    // surface lives inside the pill, and the slot holds no Send
    // while the draft is empty.
    const allMics = host!.querySelectorAll('[data-testid="c2-voice-record"]');
    expect(allMics.length).toBe(1);
    expect(slot.querySelector('[data-testid="thread-composer-send"]')).toBeNull();
    const tenant = host!.querySelector('[data-testid="thread-composer-action-tenant"]')!;
    expect(tenant.hasAttribute("hidden")).toBe(false);
  });

  it("text present: the slot becomes Send (the mic tenant hides, the containers never change)", async () => {
    stubRecorder();
    const onSend = vi.fn();
    await render(threadWithVoice({ onSend }));
    const bar = host!.querySelector('[data-testid="thread-composer-bar"]');
    const pill = host!.querySelector('[data-testid="thread-composer"]');
    const slot = host!.querySelector('[data-testid="thread-composer-action-slot"]');
    const input = host!.querySelector<HTMLInputElement>(".c1-composer-input")!;
    await act(async () => {
      typeInto(input, "See you at seven");
    });
    // Footprint/stability: the SAME bar, pill, and slot elements
    // carry the text state - nothing was swapped or re-laid-out.
    expect(host!.querySelector('[data-testid="thread-composer-bar"]')).toBe(bar);
    expect(host!.querySelector('[data-testid="thread-composer"]')).toBe(pill);
    expect(host!.querySelector('[data-testid="thread-composer-action-slot"]')).toBe(slot);
    const send = slot!.querySelector<HTMLButtonElement>('[data-testid="thread-composer-send"]')!;
    expect(send).not.toBeNull();
    expect(send.disabled).toBe(false);
    expect(send.className).toContain("is-active");
    // The mic tenant is hidden in the text state (kept mounted so
    // a live recording/review is never destroyed by the swap).
    const tenant = host!.querySelector('[data-testid="thread-composer-action-tenant"]')!;
    expect(tenant.hasAttribute("hidden")).toBe(true);
    await click(send);
    expect(onSend).toHaveBeenCalledWith("See you at seven");
    // Back to empty: the mic is the slot's visible control again.
    const tenantAfter = host!.querySelector('[data-testid="thread-composer-action-tenant"]')!;
    expect(tenantAfter.hasAttribute("hidden")).toBe(false);
    expect(host!.querySelector('[data-testid="thread-composer-send"]')).toBeNull();
  });

  it("recording renders INSIDE the bar, in the same pill; review anchors to the in-pill control", async () => {
    stubRecorder();
    sendVoiceNote.mockResolvedValue({
      message: { id: "vn-10" },
      transcript: null,
      transcription_state: "none",
      origin: "created",
    });
    await render(threadWithVoice());
    const pill = host!.querySelector('[data-testid="thread-composer"]');
    const bar = host!.querySelector('[data-testid="thread-composer-bar"]');
    await click(host!.querySelector('[data-testid="c2-voice-record"]')!);
    const recording = host!.querySelector('[data-testid="c2-voice-recording"]')!;
    expect(recording.textContent).toContain("Recording");
    expect(pill!.contains(recording)).toBe(true);
    expect(pill!.contains(host!.querySelector('[data-testid="c2-voice-stop"]')!)).toBe(true);
    expect(host!.querySelector('[data-testid="thread-composer"]')).toBe(pill);
    expect(host!.querySelector('[data-testid="thread-composer-bar"]')).toBe(bar);
    await click(host!.querySelector('[data-testid="c2-voice-stop"]')!);
    const slot = host!.querySelector('[data-testid="thread-composer-action-slot"]')!;
    const anchor = host!.querySelector('[data-testid="c2-voice-review-anchor"]')!;
    expect(slot.contains(anchor)).toBe(true);
    const review = host!.querySelector('[data-testid="c2-voice-review"]')!;
    expect(review).not.toBeNull();
    expect(review.querySelector('[data-testid="c2-voice-review-player"]')).not.toBeNull();
    await click(review.querySelector('[data-testid="c2-voice-send"]')!);
    expect(sendVoiceNote).toHaveBeenCalledTimes(1);
  });

  it("initialDraft: the composer opens populated and the slot is already Send", async () => {
    stubRecorder();
    const onSend = vi.fn();
    await render(threadWithVoice({ onSend, initialDraft: "Push to chat: dinner Saturday?" }));
    const input = host!.querySelector<HTMLInputElement>(".c1-composer-input")!;
    expect(input.value).toBe("Push to chat: dinner Saturday?");
    const send = host!.querySelector<HTMLButtonElement>('[data-testid="thread-composer-send"]')!;
    expect(send).not.toBeNull();
    expect(send.disabled).toBe(false);
    await click(send);
    expect(onSend).toHaveBeenCalledWith("Push to chat: dinner Saturday?");
  });

  it("initialDraft: a NEW host value is applied as the draft (the Push-to-chat hook)", async () => {
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
    const input = host!.querySelector<HTMLInputElement>(".c1-composer-input")!;
    expect(input.value).toBe("");
    await act(async () => {
      root!.render(
        <ThreadShell
          name="Maya"
          initials="M"
          messages={[]}
          plansById={new Map()}
          composerPlaceholder="Message Maya"
          onSend={() => {}}
          initialDraft="Landed from Orbit"
        />,
      );
    });
    expect(host!.querySelector<HTMLInputElement>(".c1-composer-input")!.value).toBe(
      "Landed from Orbit",
    );
  });

  it("the action slot is reserved furniture in CSS (44px cell inside the pill)", () => {
    const css = readFileSync(resolve(__dirname, "../../opalUi/c1/c1.css"), "utf8");
    const slot = css.match(/\.c1-composer-action-slot\s*\{([^}]*)\}/);
    expect(slot).not.toBeNull();
    expect(slot![1]).toMatch(/min-width:\s*44px/);
    expect(slot![1]).toMatch(/min-height:\s*44px/);
  });
});

describe("R20 F-2 - a thread with no voice path keeps the permanent quiet send", () => {
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
    // No mic is painted: this thread instance carries no real
    // voice path (no composerAction), so none is invented.
    expect(host!.querySelector('[data-testid="c2-voice-record"]')).toBeNull();

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

  it("no attach control is painted in the thread composer (honestly absent - no media carrier)", async () => {
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

describe("R20A settled model - the Opal chat composer divergence (honest absence)", () => {
  it("empty: the slot is reserved inside the pill but renders NO mic and NO send (no voice path is wired here)", async () => {
    await render(
      <CenterChat title="Opal" messages={[]} plansById={new Map()} onSend={() => {}} />,
    );
    const pill = host!.querySelector('[data-testid="opal-chat-composer"]')!;
    const slot = host!.querySelector('[data-testid="opal-chat-composer-action-slot"]')!;
    expect(pill).not.toBeNull();
    expect(pill.contains(slot)).toBe(true);
    // Honest absence pinned: no mic control anywhere on the
    // surface, and the empty slot carries no control at all.
    expect(host!.querySelector('[data-testid="c2-voice-record"]')).toBeNull();
    expect(slot.querySelector("button")).toBeNull();
    expect(slot.querySelector('[data-testid="opal-chat-composer-send"]')).toBeNull();
  });

  it("text present: the slot shows Send, which sends and clears back to the empty slot", async () => {
    const onSend = vi.fn();
    await render(
      <CenterChat title="Opal" messages={[]} plansById={new Map()} onSend={onSend} />,
    );
    const pill = host!.querySelector('[data-testid="opal-chat-composer"]');
    const input = host!.querySelector<HTMLInputElement>(".c1-composer-input")!;
    await act(async () => {
      typeInto(input, "Plan dinner Saturday");
    });
    // Same pill container in the text state (stable footprint).
    expect(host!.querySelector('[data-testid="opal-chat-composer"]')).toBe(pill);
    const slot = host!.querySelector('[data-testid="opal-chat-composer-action-slot"]')!;
    const send = slot.querySelector<HTMLButtonElement>('[data-testid="opal-chat-composer-send"]')!;
    expect(send).not.toBeNull();
    expect(send.disabled).toBe(false);
    expect(send.className).toContain("is-active");
    await click(send);
    expect(onSend).toHaveBeenCalledWith("Plan dinner Saturday");
    expect(
      host!.querySelector('[data-testid="opal-chat-composer-action-slot"]')!.querySelector("button"),
    ).toBeNull();
  });

  it("no attach control is painted in the Opal chat composer either", async () => {
    await render(
      <CenterChat title="Opal" messages={[]} plansById={new Map()} onSend={() => {}} />,
    );
    const bar = host!.querySelector(".c1-composer-bar")!;
    expect(bar.querySelector('[data-testid*="attach" i]')).toBeNull();
    expect(bar.querySelector('[aria-label*="ttach" i]')).toBeNull();
  });
});
