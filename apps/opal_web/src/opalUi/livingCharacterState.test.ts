import { describe, expect, it } from "vitest";
import {
  headphonesVisible,
  initialLivingCharacter,
  LIVING_CHARACTER_STATES,
  reduceLivingCharacter,
} from "./livingCharacterState";

describe("W6A1 living character state machine", () => {
  it("exposes the eight exact state names plus back_to_idle", () => {
    expect(LIVING_CHARACTER_STATES).toEqual([
      "idle",
      "notice",
      "prepare",
      "listening",
      "processing",
      "thinking",
      "response_ready",
      "speaking",
      "back_to_idle",
    ]);
  });

  it("advances tap → notice → prepare on timers; headphones from notice", () => {
    let m = initialLivingCharacter();
    expect(m.state).toBe("idle");
    expect(headphonesVisible(m.state)).toBe(false);
    m = reduceLivingCharacter(m, { type: "tap" });
    expect(m.state).toBe("notice");
    expect(headphonesVisible(m.state)).toBe(true);
    m = reduceLivingCharacter(m, { type: "timer", name: "notice_done" });
    expect(m.state).toBe("prepare");
  });

  it("listening only after mic_open (never fake)", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "tap" });
    m = reduceLivingCharacter(m, { type: "timer", name: "notice_done" });
    expect(m.state).toBe("prepare");
    m = reduceLivingCharacter(m, { type: "mic_open" });
    expect(m.state).toBe("listening");
  });

  it("mic denied returns idle with honest permission prompt", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "tap" });
    m = reduceLivingCharacter(m, { type: "mic_denied" });
    expect(m.state).toBe("idle");
    expect(m.permissionPrompt).toMatch(/Microphone access is blocked/);
    expect(headphonesVisible(m.state)).toBe(false);
  });

  it("thinking only on request_start; speaking only on speech_start", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "mic_open" });
    m = reduceLivingCharacter(m, { type: "utterance_captured" });
    expect(m.state).toBe("processing");
    m = reduceLivingCharacter(m, { type: "request_start" });
    expect(m.state).toBe("thinking");
    m = reduceLivingCharacter(m, { type: "request_end" });
    expect(m.state).toBe("response_ready");
    m = reduceLivingCharacter(m, { type: "speech_start" });
    expect(m.state).toBe("speaking");
    m = reduceLivingCharacter(m, { type: "speech_end" });
    expect(m.state).toBe("back_to_idle");
    m = reduceLivingCharacter(m, { type: "timer", name: "back_done" });
    expect(m.state).toBe("idle");
  });

  it("does not auto-advance listening without real mic/request/audio events", () => {
    let m = reduceLivingCharacter(initialLivingCharacter(), { type: "mic_open" });
    expect(m.state).toBe("listening");
    m = reduceLivingCharacter(m, { type: "timer", name: "notice_done" });
    expect(m.state).toBe("listening");
    m = reduceLivingCharacter(m, { type: "timer", name: "prepare_done" });
    expect(m.state).toBe("listening");
  });
});
