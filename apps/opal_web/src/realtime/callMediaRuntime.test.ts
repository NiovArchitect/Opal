import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { callHistoryLabel, deriveCallView } from "../opalUi/callView";
import { callChannelTopic } from "./CallClient";
import {
  MEDIA_FAILURE_COPY,
  applyMediaSignal,
  beginMedia,
  callDiagSnapshot,
  callMediaFromRuntime,
  cleanupPeer,
  createMediaRuntime,
  fireMediaTimeout,
  mediaMayStart,
  overlayCallNote,
  peerEventApplies,
  recordCallDiag,
  reduceLiveMedia,
  replaceCallRuntime,
  resetCallDiag,
} from "./callMediaRuntime";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("call media state", () => {
  it("INCOMING_HAS_NO_MEDIA_ERROR_BEFORE_ACCEPT", () => {
    const runtime = createMediaRuntime("call-1");
    expect(mediaMayStart({ role: "callee", serverStatus: "ringing" })).toBe(false);
    expect(runtime.mediaState).toBe("not_started");
    expect(runtime.mediaError).toBeNull();
    expect(runtime.timerCallId).toBeNull();
    const ignored = reduceLiveMedia(runtime, {
      callId: "call-1",
      signal: "failed",
      reason: "media_timeout",
      accepted: false,
      now: 1,
    });
    expect(ignored.mediaState).toBe("not_started");
    const view = deriveCallView({ role: "callee", serverStatus: "ringing", media: "idle" });
    expect(view.phase).toBe("incoming_ringing");
    expect(view.status).toBe("Incoming call");
    expect(view.showAccept).toBe(true);
    expect(view.showDecline).toBe(true);
    expect(overlayCallNote(view.phase, MEDIA_FAILURE_COPY)).toBeNull();
  });

  it("CONNECTING_HAS_NO_FAILURE_COPY_UNTIL_FAILED", () => {
    const connecting = deriveCallView({
      role: "callee",
      serverStatus: "answered",
      locallyAccepted: true,
      media: "connecting",
    });
    expect(connecting.phase).toBe("connecting");
    expect(connecting.status).toBe("Connecting audio…");
    expect(connecting.showEnd).toBe(true);
    expect(connecting.showAccept).toBe(false);
    expect(overlayCallNote(connecting.phase, MEDIA_FAILURE_COPY)).toBeNull();
    const failed = deriveCallView({
      role: "callee",
      serverStatus: "answered",
      locallyAccepted: true,
      media: "failed",
    });
    expect(failed.phase).toBe("failed");
    expect(failed.status).toBe(MEDIA_FAILURE_COPY);
    expect(failed.status).not.toBe("Connecting audio…");
    expect(overlayCallNote(failed.phase, MEDIA_FAILURE_COPY)).toBeNull();
  });

  it("MEDIA_ERROR_SCOPED_TO_CALL_ID", () => {
    let first = reduceLiveMedia(createMediaRuntime("call-1"), {
      callId: "call-1",
      signal: "connecting",
      accepted: true,
      now: 10,
    });
    first = applyMediaSignal(first, { callId: "call-1", signal: "failed", reason: "media_timeout", now: 11 });
    expect(first.mediaError).toBe("media_timeout");
    const second = createMediaRuntime("call-2");
    expect(applyMediaSignal(second, { callId: "call-1", signal: "failed", reason: "media_timeout" })).toEqual(second);
    expect(callMediaFromRuntime(first, "call-2")).toBe("idle");
    expect(callMediaFromRuntime(first, "call-1")).toBe("failed");
  });

  it("NEW_CALL_CLEARS_PRIOR_MEDIA_ERROR", () => {
    let previous = beginMedia(createMediaRuntime("call-1"), "call-1", 4);
    previous = applyMediaSignal(previous, { callId: "call-1", signal: "failed", reason: "needs_turn" });
    expect(previous.needsTurn).toBe(true);
    const next = replaceCallRuntime(previous, "call-2");
    expect(next.callId).toBe("call-2");
    expect(next.mediaState).toBe("not_started");
    expect(next.mediaError).toBeNull();
    expect(next.needsTurn).toBe(false);
    expect(next.connectStartedAt).toBeNull();
    expect(next.connectedAt).toBeNull();
    expect(next.timerCallId).toBeNull();
    expect(next.peerGeneration).toBe(0);
  });

  it("MEDIA_TIMEOUT_STARTS_AFTER_ACCEPT", () => {
    const ringing = createMediaRuntime("call-1");
    expect(ringing.connectStartedAt).toBeNull();
    expect(fireMediaTimeout(ringing, "call-1", 5).mediaState).toBe("not_started");
    const started = reduceLiveMedia(ringing, {
      callId: "call-1",
      signal: "connecting",
      accepted: true,
      now: 20,
    });
    expect(mediaMayStart({ role: "callee", serverStatus: "answered" })).toBe(true);
    expect(started.timerCallId).toBe("call-1");
    expect(started.connectStartedAt).toBe(20);
    expect(started.mediaState).toBe("connecting");
  });

  it("OLD_MEDIA_TIMEOUT_IGNORED", () => {
    let current = reduceLiveMedia(createMediaRuntime("call-2"), {
      callId: "call-2",
      signal: "connecting",
      accepted: true,
      now: 30,
    });
    current = fireMediaTimeout(current, "call-1", 99);
    expect(current.mediaState).toBe("connecting");
    expect(current.mediaError).toBeNull();
    const fired = fireMediaTimeout(current, "call-2", 100);
    expect(fired.mediaState).toBe("failed");
    expect(fired.mediaError).toBe("media_timeout");
  });

  it("OLD_PEER_CLEANUP_DOES_NOT_CLOSE_NEW_CALL", () => {
    const current = beginMedia(createMediaRuntime("call-2"), "call-2", 8);
    const stale = cleanupPeer(current, "call-1", "call-2");
    expect(stale.closed).toBe(false);
    expect(stale.runtime.peerGeneration).toBe(current.peerGeneration);
    expect(stale.runtime.mediaState).toBe("acquiring_mic");
    expect(peerEventApplies(true, "call-1", "call-1")).toBe(false);
    expect(peerEventApplies(false, "call-1", "call-2")).toBe(false);
    const own = cleanupPeer(current, "call-2", "call-2");
    expect(own.closed).toBe(true);
    expect(own.runtime.mediaState).toBe("closed");
    expect(own.runtime.timerCallId).toBeNull();
  });

  it("CURRENT_CALL_CHANNEL_IDS_MATCH", () => {
    const callId = "4f0c0c2a-6a1e-4c0a-9c1d-111111111111";
    expect(callChannelTopic(callId)).toBe(`call:${callId}`);
    expect(callChannelTopic(callId)).toBe(callChannelTopic(callId));
  });

  it("ACCEPT_SIGNALING_SEQUENCE", () => {
    const seen: string[] = [];
    let runtime = createMediaRuntime("call-9");
    seen.push("incoming");
    expect(mediaMayStart({ role: "callee", serverStatus: "ringing" })).toBe(false);
    runtime = reduceLiveMedia(runtime, {
      callId: "call-9",
      signal: "failed",
      reason: "media_timeout",
      accepted: false,
      now: 1,
    });
    expect(runtime.mediaState).toBe("not_started");
    seen.push("accept");
    expect(mediaMayStart({ role: "callee", serverStatus: "answered" })).toBe(true);
    runtime = reduceLiveMedia(runtime, {
      callId: "call-9",
      signal: "connecting",
      accepted: true,
      now: 2,
    });
    seen.push("ready");
    expect(runtime.mediaState).toBe("connecting");
    expect(overlayCallNote("connecting", MEDIA_FAILURE_COPY)).toBeNull();
    runtime = applyMediaSignal(runtime, { callId: "call-9", signal: "connected", now: 3 });
    seen.push("connected");
    expect(runtime.connectedAt).toBe(3);
    expect(runtime.timerCallId).toBeNull();
    expect(seen).toEqual(["incoming", "accept", "ready", "connected"]);
  });

  it("RAPID_RETRY_MEDIA_STATE_CLEAN", () => {
    let first = reduceLiveMedia(createMediaRuntime("call-1"), {
      callId: "call-1",
      signal: "connecting",
      accepted: true,
      now: 1,
    });
    first = applyMediaSignal(first, { callId: "call-1", signal: "failed", reason: "media_failed" });
    const retry = replaceCallRuntime(first, "call-2");
    const view = deriveCallView({ role: "callee", serverStatus: "ringing", media: callMediaFromRuntime(retry, "call-2") });
    expect(retry.mediaState).toBe("not_started");
    expect(view.status).toBe("Incoming call");
    expect(view.showAccept).toBe(true);
    expect(overlayCallNote(view.phase, "Declined")).toBeNull();
    expect(overlayCallNote(view.phase, MEDIA_FAILURE_COPY)).toBeNull();
    expect(overlayCallNote(view.phase, "Couldn't answer")).toBe("Couldn't answer");
  });

  it("IMPOSSIBLE_MIXED_CALL_STATE", () => {
    const incoming = deriveCallView({
      role: "callee",
      serverStatus: "ringing",
      media: "failed",
    });
    expect(incoming.status).toBe("Incoming call");
    expect(incoming.showAccept).toBe(true);
    expect(overlayCallNote(incoming.phase, MEDIA_FAILURE_COPY)).toBeNull();
    const connecting = deriveCallView({
      role: "caller",
      serverStatus: "answered",
      media: "connecting",
    });
    expect(`${connecting.status} ${overlayCallNote(connecting.phase, MEDIA_FAILURE_COPY) ?? ""}`.trim()).toBe(
      "Connecting audio…",
    );
  });

  it("CALL_HISTORY_STATUS_DRIVES_LIVE_UI", () => {
    const history = callHistoryLabel({ status: "ended", endedReason: "media_failed", viewer: "callee" });
    expect(history).toBe("Call couldn't connect");
    const live = deriveCallView({ role: "callee", serverStatus: "ringing", media: "idle" });
    expect(live.status).toBe("Incoming call");
    expect(live.status).not.toBe(history);
    expect(overlayCallNote(live.phase, history)).toBeNull();
  });

  it("keeps dev diagnostics free of SDP and audio", () => {
    resetCallDiag();
    recordCallDiag({
      callId: "call-1",
      at: 50,
      event: "offer_created",
      signalingState: "have-local-offer",
      iceGatheringState: "gathering",
      iceConnectionState: "checking",
      connectionState: "connecting",
    });
    const snap = callDiagSnapshot("call-1");
    expect(snap).toHaveLength(1);
    expect(JSON.stringify(snap)).not.toMatch(/sdp|candidate|sample|audio\//i);
    expect(Object.keys(snap[0] ?? {}).sort()).toEqual([
      "at",
      "callId",
      "connectionState",
      "event",
      "iceConnectionState",
      "iceGatheringState",
      "signalingState",
    ]);
  });

  it("does not render media failure as a sticky call note", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    const surface = readFileSync(resolve(root, "src/opalUi/CallSurfaces.tsx"), "utf8");
    const overlay = readFileSync(resolve(root, "src/opalUi/ActiveCallOverlay.tsx"), "utf8");
    expect(app).not.toContain(MEDIA_FAILURE_COPY);
    expect(app).toContain("key={callSurface.liveCallId}");
    expect(app).toContain("reduceLiveMedia");
    expect(surface).toContain("overlayCallNote");
    expect(surface).toContain('statusNote !== "Calling…"');
    expect(overlay).toContain('useState(call.status === "answered")');
    expect(overlay).toContain("setMediaReady(true)");
    expect(overlay).toContain('ch.on("ended"');
    expect(overlay).toContain("callIdRef.current !== ownedId");
  });
});
