import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applyCallInbox, noteForCall, type LiveCallSurface } from "./callLifecycle";

const incoming = (id: string, status = "ringing"): LiveCallSurface => ({
  kind: "incoming",
  direction: "incoming",
  peerName: "Walk A",
  liveCallId: id,
  liveCallStatus: status,
  liveCallerUserId: "caller",
  liveCalleeUserId: "callee",
  locallyAccepted: false,
});

describe("call lifecycle stays on one call id", () => {
  it("does not dismiss the callee when the answer event arrives", () => {
    const next = applyCallInbox({
      surface: incoming("call-1"),
      note: null,
      event: { event: "answered", call_id: "call-1" },
      me: "callee",
    });
    expect(next.surface?.liveCallId).toBe("call-1");
    expect(next.surface?.liveCallStatus).toBe("answered");
  });

  it("clears Declined when a new call starts ringing", () => {
    const next = applyCallInbox({
      surface: null,
      note: { callId: "call-1", text: "Declined" },
      event: { event: "ringing", call_id: "call-2", from_user_id: "caller" },
      me: "callee",
      peerName: "Walk A",
    });
    expect(next.surface?.liveCallId).toBe("call-2");
    expect(next.surface?.liveCallStatus).toBe("ringing");
    expect(next.note).toBeNull();
    expect(noteForCall(next.note, "call-2")).toBeNull();
  });

  it("ignores a late decline for the previous call", () => {
    const next = applyCallInbox({
      surface: incoming("call-2"),
      note: null,
      event: { event: "ended", call_id: "call-1", reason: "declined" },
      me: "callee",
    });
    expect(next.surface?.liveCallId).toBe("call-2");
    expect(next.surface?.liveCallStatus).toBe("ringing");
    expect(next.note).toBeNull();
  });

  it("clears only the call that was declined", () => {
    const next = applyCallInbox({
      surface: incoming("call-1"),
      note: null,
      event: { event: "ended", call_id: "call-1", reason: "declined" },
      me: "callee",
    });
    expect(next.surface).toBeNull();
    expect(next.note).toEqual({ callId: "call-1", text: "Declined" });
    expect(noteForCall(next.note, "call-2")).toBeNull();
  });

  it("CONNECTED_REMOTE_HANGUP_PROPAGATES", () => {
    const connected = (role: "caller" | "callee"): LiveCallSurface => ({
      kind: "audio",
      direction: role === "caller" ? "outgoing" : "incoming",
      peerName: role === "caller" ? "Walk B" : "Walk A",
      liveCallId: "call-4",
      liveCallStatus: "answered",
      locallyAccepted: true,
    });

    for (const surface of [connected("caller"), connected("callee")]) {
      const next = applyCallInbox({
        surface,
        note: null,
        event: { event: "ended", call_id: "call-4", reason: "hangup" },
      });
      expect(next.surface).toBeNull();
      expect(next.note).toBeNull();
    }

    const overlay = readFileSync(resolve(__dirname, "ActiveCallOverlay.tsx"), "utf8");
    expect(overlay).toContain("setMediaReady(true)");
    const media = overlay.slice(overlay.indexOf("One media channel"));
    expect(media).toContain('ch.on("ended"');
    expect(media).toContain("onEndedRef.current(ownedId)");
    expect(media).not.toContain("mediaChannel?.leave()");
  });
});
