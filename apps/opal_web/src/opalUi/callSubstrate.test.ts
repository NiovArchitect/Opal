import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applyCallInbox } from "./callLifecycle";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("foreground call substrate", () => {
  it("INTEGRATED_FOREGROUND_CALL_A_TO_B starts media when the call channel answers", () => {
    const overlay = read("opalUi/ActiveCallOverlay.tsx");
    const client = read("realtime/CallClient.ts");
    expect(overlay).toContain("setMediaReady(true)");
    expect(overlay).toContain('ch.on("answered"');
    expect(client).toContain('this.pushSignal("ready", { ready: true })');
    expect(client).toContain("await this.makeOffer()");
    expect(client).not.toContain("peerEventApplies");
    expect(overlay).not.toContain("mediaChannel?.leave()");
  });

  it("INTEGRATED_FOREGROUND_CALL_B_TO_A uses the same answerer ready path", () => {
    const client = read("realtime/CallClient.ts");
    const answerer = client.slice(client.indexOf("if (asOfferer)"), client.indexOf("async stop"));
    expect(answerer).toContain("makeOffer()");
    expect(answerer).toContain('pushSignal("ready"');
  });

  it("INTEGRATED_REMOTE_HANGUP closes the current call from the channel that stays joined", () => {
    const overlay = read("opalUi/ActiveCallOverlay.tsx");
    const media = overlay.slice(overlay.indexOf("One media channel"));
    expect(media).toContain('ch.on("ended"');
    const next = applyCallInbox({
      surface: {
        kind: "audio",
        direction: "outgoing",
        peerName: "Walk B",
        liveCallId: "call-live",
        liveCallStatus: "answered",
      },
      note: null,
      event: { event: "ended", call_id: "call-live", reason: "hangup" },
    });
    expect(next.surface).toBeNull();
  });

  it("INTEGRATED_CALL_WITH_ASSIST_INSTALLED_OFF does not give Assist the call microphone", () => {
    const surface = read("opalUi/CallSurfaces.tsx");
    const assist = read("opalUi/callAssist.tsx");
    expect(surface).toContain('view.phase === "connected" && assistCallId');
    expect(assist).toContain("tapCallMicrophone");
    expect(assist).not.toContain("getUserMedia");
    expect(assist).toContain('assistRef.current !== "active"');
    expect(assist).toContain("stream?.getTracks().forEach");
    expect(assist).not.toContain("remoteAudio");
  });

  it("INTEGRATED_CALL_WITH_ASSIST_ACTIVE stops only its own stream when the screen leaves", () => {
    const assist = read("opalUi/callAssist.tsx");
    const stop = assist.slice(assist.indexOf("const stopHearing"), assist.indexOf("const hear"));
    expect(stop).toContain("stream?.getTracks().forEach");
    expect(stop).not.toContain("CallClient");
    expect(stop).not.toContain("localStream");
  });
});
