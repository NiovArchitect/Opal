/**
 * Repair #17 W6 — Living center character presence.
 *
 * Founder requirement: the Opal Center character is DYNAMIC — its state
 * reflects what Opal is actually doing: idle / listening / thinking /
 * responding. Hard law: a state may only appear while its real signal is
 * active; no in-flight request ⇒ never "thinking".
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialLivingCharacter,
  LIVING_CHARACTER_STATES,
  reduceLivingCharacter,
  type LivingCharacterEvent,
  type LivingCharacterMachine,
} from "./livingCharacterState";
import {
  deriveOpalPresence,
  OPAL_PRESENCE_STATES,
  presenceStateForLivingState,
} from "./opalPresence";
import { OpalLivingCharacter } from "./OpalLivingCharacter";

const listenOnceMock = vi.fn();
const probeMicPermissionMock = vi.fn(async () => "prompt" as const);
const requestMicPermissionMock = vi.fn(async () => "granted" as const);
const speakTextMock = vi.fn(async () => undefined);
const stopListeningMock = vi.fn();
const stopSpeakingMock = vi.fn();

vi.mock("./opalCenterVoice", () => ({
  listenOnce: (...args: unknown[]) => listenOnceMock(...args),
  probeMicPermission: (...args: unknown[]) => probeMicPermissionMock(...args),
  requestMicPermission: (...args: unknown[]) => requestMicPermissionMock(...args),
  speakText: (...args: unknown[]) => speakTextMock(...(args as [string])),
  stopListening: (...args: unknown[]) => stopListeningMock(...args),
  stopSpeaking: (...args: unknown[]) => stopSpeakingMock(...args),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rootDir = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(rootDir, "src", rel), "utf8");

describe("R17 W6 presence quartet derivation (pure)", () => {
  it("exposes exactly idle / listening / thinking / responding", () => {
    expect(OPAL_PRESENCE_STATES).toEqual(["idle", "listening", "thinking", "responding"]);
  });

  it("no signal ⇒ idle (never thinking, never responding)", () => {
    expect(deriveOpalPresence({})).toBe("idle");
    expect(
      deriveOpalPresence({ listening: false, requestInFlight: false, responding: false }),
    ).toBe("idle");
  });

  it("each real signal maps to its state", () => {
    expect(deriveOpalPresence({ listening: true })).toBe("listening");
    expect(deriveOpalPresence({ requestInFlight: true })).toBe("thinking");
    expect(deriveOpalPresence({ responding: true })).toBe("responding");
  });

  it("priority: listening > thinking > responding > idle", () => {
    expect(
      deriveOpalPresence({ listening: true, requestInFlight: true, responding: true }),
    ).toBe("listening");
    expect(deriveOpalPresence({ requestInFlight: true, responding: true })).toBe("thinking");
  });

  it("maps every living state; thinking/responding/listening only from real-event states", () => {
    const mapped = Object.fromEntries(
      LIVING_CHARACTER_STATES.map((s) => [s, presenceStateForLivingState(s)]),
    );
    expect(mapped).toEqual({
      idle: "idle",
      notice: "idle", // tap beat — mic not capturing yet, must not claim listening
      prepare: "idle", // headphones beat — mic not capturing yet
      listening: "listening",
      processing: "thinking",
      thinking: "thinking",
      response_ready: "responding",
      speaking: "responding",
      back_to_idle: "idle",
    });
  });
});

describe("R17 W6 living machine honesty (reducer)", () => {
  it("timers and taps alone can never reach listening/thinking/responding", () => {
    const allowed: LivingCharacterEvent[] = [
      { type: "tap" },
      { type: "timer", name: "notice_done" },
      { type: "timer", name: "prepare_done" },
      { type: "timer", name: "processing_done" },
      { type: "timer", name: "ready_done" },
      { type: "timer", name: "back_done" },
      { type: "speech_end" },
      { type: "mic_closed" },
      { type: "utterance_captured" },
      { type: "request_end" },
    ];
    // Breadth-first over every reachable machine using only non-signal events.
    const seen = new Set<string>();
    let frontier: LivingCharacterMachine[] = [initialLivingCharacter()];
    while (frontier.length) {
      const next: LivingCharacterMachine[] = [];
      for (const m of frontier) {
        if (seen.has(m.state)) continue;
        seen.add(m.state);
        expect(presenceStateForLivingState(m.state)).toBe("idle");
        for (const ev of allowed) next.push(reduceLivingCharacter(m, ev));
      }
      frontier = next;
    }
    expect([...seen].sort()).toEqual(["idle", "notice", "prepare"]);
  });

  it("tap-stop while listening unwinds (speech_end no longer pins listening)", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "mic_open" });
    expect(m.state).toBe("listening");
    m = reduceLivingCharacter(m, { type: "speech_end" });
    expect(m.state).toBe("back_to_idle");
    m = reduceLivingCharacter(m, { type: "timer", name: "back_done" });
    expect(m.state).toBe("idle");
  });

  it("mic_closed unwinds listening when the parent capture session ends", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "mic_open" });
    m = reduceLivingCharacter(m, { type: "mic_closed" });
    expect(m.state).toBe("back_to_idle");
    expect(m.micLevel).toBe(0);
  });

  it("empty STT result path unwinds: processing with no request returns via speech_end", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "mic_open" });
    m = reduceLivingCharacter(m, { type: "utterance_captured" });
    expect(m.state).toBe("processing");
    m = reduceLivingCharacter(m, { type: "speech_end" });
    expect(m.state).toBe("back_to_idle");
  });

  it("request_end from processing lands on response_ready (reply arrived)", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "mic_open" });
    m = reduceLivingCharacter(m, { type: "utterance_captured" });
    m = reduceLivingCharacter(m, { type: "request_end" });
    expect(m.state).toBe("response_ready");
    expect(presenceStateForLivingState(m.state)).toBe("responding");
  });
});

describe("R17 W6 OpalLivingCharacter component (real props drive presence)", () => {
  let container: HTMLDivElement;
  let root: Root;

  const el = () =>
    container.querySelector('[data-testid="opal-living-character"]') as HTMLElement | null;
  const presence = () => el()?.getAttribute("data-presence-state");
  const living = () => el()?.getAttribute("data-living-state");

  beforeEach(() => {
    vi.useFakeTimers();
    listenOnceMock.mockReset().mockImplementation(() => new Promise(() => undefined));
    probeMicPermissionMock.mockReset().mockResolvedValue("prompt" as const);
    requestMicPermissionMock.mockReset().mockResolvedValue("granted" as const);
    speakTextMock.mockReset().mockResolvedValue(undefined);
    stopListeningMock.mockReset();
    stopSpeakingMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("renders idle with no signals — never thinking on mount", async () => {
    await act(async () => {
      root.render(<OpalLivingCharacter />);
    });
    expect(living()).toBe("idle");
    expect(presence()).toBe("idle");
  });

  it("requestInFlight drives thinking; its end drives responding, then back to idle", async () => {
    await act(async () => {
      root.render(<OpalLivingCharacter requestInFlight={false} />);
    });
    expect(presence()).toBe("idle");

    await act(async () => {
      root.render(<OpalLivingCharacter requestInFlight />);
    });
    expect(living()).toBe("thinking");
    expect(presence()).toBe("thinking");
    expect(container.querySelector('[data-testid="opal-living-status"]')?.textContent).toMatch(
      /Finding the best response/,
    );

    await act(async () => {
      root.render(<OpalLivingCharacter requestInFlight={false} />);
    });
    expect(living()).toBe("response_ready");
    expect(presence()).toBe("responding");

    await act(async () => {
      vi.advanceTimersByTime(480);
    });
    expect(living()).toBe("back_to_idle");
    await act(async () => {
      vi.advanceTimersByTime(520);
    });
    expect(living()).toBe("idle");
    expect(presence()).toBe("idle");
  });

  it("externalListening (parent mic capture) drives listening and unwinds when it ends", async () => {
    await act(async () => {
      root.render(<OpalLivingCharacter externalListening={false} />);
    });
    expect(presence()).toBe("idle");

    await act(async () => {
      root.render(<OpalLivingCharacter externalListening />);
    });
    expect(living()).toBe("listening");
    expect(presence()).toBe("listening");

    await act(async () => {
      root.render(<OpalLivingCharacter externalListening={false} />);
    });
    expect(living()).toBe("back_to_idle");
    await act(async () => {
      vi.advanceTimersByTime(520);
    });
    expect(living()).toBe("idle");
    expect(presence()).toBe("idle");
  });

  it("audioPlaying drives responding (speaking) only while audio plays", async () => {
    await act(async () => {
      root.render(<OpalLivingCharacter audioPlaying />);
    });
    expect(living()).toBe("speaking");
    expect(presence()).toBe("responding");

    await act(async () => {
      root.render(<OpalLivingCharacter audioPlaying={false} />);
    });
    expect(living()).toBe("back_to_idle");
  });

  it("tap alone is NOT listening — listening starts only when the mic actually opens", async () => {
    await act(async () => {
      root.render(<OpalLivingCharacter />);
    });
    await act(async () => {
      el()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    // Notice beat: user tapped, mic not open yet.
    expect(living()).toBe("notice");
    expect(presence()).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(420);
    });
    expect(living()).toBe("prepare");
    expect(presence()).toBe("idle");

    // Prepare beat elapses → component requests permission and opens STT.
    await act(async () => {
      vi.advanceTimersByTime(380);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(requestMicPermissionMock).toHaveBeenCalled();
    expect(listenOnceMock).toHaveBeenCalled();
    expect(living()).toBe("listening");
    expect(presence()).toBe("listening");
  });
});

describe("R17 W6 walked-surface wiring (source contracts)", () => {
  it("chat header character is bound to real chat state: sending, provider work, composer mic, TTS", () => {
    const chat = read("opalUi/OpalCenterChat.tsx");
    expect(chat).toMatch(/testId="opal-center-chat-presence"/);
    expect(chat).toMatch(/requestInFlight=\{sending \|\| providerWorking\}/);
    expect(chat).toMatch(/externalListening=\{listening\}/);
    expect(chat).toMatch(/audioPlaying=\{audioPlaying\}/);
    // providerWorking derives from the real queued/running action_state signal.
    expect(chat).toMatch(/const providerWorking = messages\.some/);
    expect(chat).toMatch(/m\.metadata\?\.action_state === "queued"/);
    expect(chat).toMatch(/m\.metadata\?\.action_state === "running"/);
  });

  it("Center rest header character is bound to resolving, rest-surface mic, and speak queue", () => {
    const center = read("opalUi/OpalCenterLifeGraph.tsx");
    expect(center).toMatch(/testId="opal-center-presence"/);
    expect(center).toMatch(/requestInFlight=\{resolving\}/);
    expect(center).toMatch(/externalListening=\{listening\}/);
    expect(center).toMatch(/speakQueue=\{speakQueue\}/);
  });

  it("character component exposes the founder presence quartet from real machine state", () => {
    const comp = read("opalUi/OpalLivingCharacter.tsx");
    expect(comp).toMatch(/data-presence-state=\{presence\}/);
    expect(comp).toMatch(/presenceStateForLivingState\(state\)/);
    expect(comp).toMatch(/externalListening/);
  });

  it("reduced motion: living character animations are disabled under prefers-reduced-motion", () => {
    const css = read("styles.css");
    const marker = css.indexOf("Repair #17 W6 — reduced motion");
    expect(marker).toBeGreaterThan(-1);
    const block = css.slice(marker, marker + 900);
    expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(block).toMatch(/\.opal-living-art/);
    expect(block).toMatch(/\.opal-living-border/);
    expect(block).toMatch(/animation: none !important/);
  });

  it("motion treatments exist per presence state and stay calm (no rotation/spin)", () => {
    const css = read("styles.css");
    const start = css.indexOf("W6A1 Living Opal Center character");
    const livingCss = css.slice(start, start + 9000);
    expect(livingCss).toMatch(/\.opal-living-idle \.opal-living-art/);
    expect(livingCss).toMatch(/\.opal-living-listening \.opal-living-border/);
    expect(livingCss).toMatch(/\.opal-living-thinking \.opal-living-art/);
    expect(livingCss).toMatch(/\.opal-living-speaking \.opal-living-art/);
    expect(livingCss).not.toMatch(/rotate\(/);
  });
});
