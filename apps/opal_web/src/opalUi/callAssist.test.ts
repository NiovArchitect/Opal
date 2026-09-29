import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("call assist consent", () => {
  const assist = readFileSync(resolve(__dirname, "callAssist.tsx"), "utf8");
  const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
  const client = readFileSync(resolve(__dirname, "../api/productClient.ts"), "utf8");

  it("transcribes only after both people allow, using a server grant", () => {
    expect(surface).toMatch(/view\.phase === "connected" && assistCallId/);
    expect(surface).not.toMatch(/view\.phase === "connected" && assistCallId && assistBearer/);
    expect(assist).toMatch(/grantCallTranscription/);
    expect(assist).toMatch(/tapCallMicrophone/);
    expect(assist).not.toMatch(/getUserMedia/);
    expect(assist).toMatch(/postCallTranscript/);
    expect(assist).toMatch(/if \(!text \|\| !isFinal\) return/);
    expect(assist).not.toMatch(/DEEPGRAM_API_KEY/);
    expect(client).not.toMatch(/DEEPGRAM_API_KEY/);
    expect(assist).not.toMatch(/remoteAudio|HTMLAudioElement/);
  });

  it("CONNECTED_REMOTE_HANGUP_WITH_ASSIST_ACTIVE stops hearing when the call screen leaves", () => {
    expect(assist).toMatch(/stopped = true/);
    expect(assist).toMatch(/stopHearing\(\)/);
    expect(assist).toMatch(/if \(stopped \|\| assistRef\.current !== "active" \|\| mutedRef\.current \|\| ws\) return/);
    const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");
    const end = app.slice(app.indexOf("const endLiveCall"), app.indexOf("const endLiveCall") + 500);
    expect(end).not.toMatch(/transcription|Deepgram|Assist|hear\(/);
    const remote = app.slice(app.indexOf("const onLiveCallEnded"), app.indexOf("const onLiveCallEnded") + 500);
    expect(remote).toContain("callSurfaceRef.current = null");
    expect(remote).not.toMatch(/transcription|Deepgram|hear\(/);
  });
});
