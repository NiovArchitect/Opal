import { describe, expect, it } from "vitest";
import { callHistoryLabel, callHistoryLine, deriveCallView, formatCallClock } from "./callView";

describe("call view", () => {
  it("shows the callee an incoming call with accept and decline, and no timer", () => {
    const view = deriveCallView({
      role: "callee",
      serverStatus: "ringing",
      media: "idle",
    });
    expect(view.status).toBe("Incoming call");
    expect(view.showAccept).toBe(true);
    expect(view.showDecline).toBe(true);
    expect(view.showTimer).toBe(false);
    expect(view.showMute).toBe(false);
  });

  it("shows the caller Calling until the other person accepts", () => {
    const view = deriveCallView({
      role: "caller",
      serverStatus: "ringing",
      media: "idle",
    });
    expect(view.status).toBe("Calling…");
    expect(view.showCancel).toBe(true);
    expect(view.showTimer).toBe(false);
  });

  it("does not start the timer until media is connected", () => {
    const connecting = deriveCallView({
      role: "caller",
      serverStatus: "answered",
      media: "connecting",
    });
    expect(connecting.status).toBe("Connecting audio…");
    expect(connecting.showTimer).toBe(false);
    const connected = deriveCallView({
      role: "callee",
      serverStatus: "answered",
      locallyAccepted: true,
      media: "connected",
    });
    expect(connected.showTimer).toBe(true);
    expect(connected.showMute).toBe(true);
  });

  it("does not invent a duration when media never connected", () => {
    expect(
      callHistoryLabel({
        status: "ended",
        endedReason: "hangup",
        endedAt: "2026-09-27T22:18:01Z",
      }),
    ).toBe("Call couldn't connect");
    expect(
      callHistoryLabel({
        status: "ended",
        endedReason: "hangup",
        mediaConnectedAt: "2026-09-27T22:17:10Z",
        endedAt: "2026-09-27T22:21:22Z",
      }),
    ).toBe("Audio call · 4m 12s");
  });

  it("shows the peer and local time, and never a call uuid", () => {
    const createdAt = "2026-09-27T22:16:52.135Z";
    const line = callHistoryLine({
      historyLabel: "Call couldn't connect",
      createdAt,
      peerName: "Walk B",
    });
    expect(line).toEqual({
      name: "Walk B",
      metadata: `Call couldn't connect · ${formatCallClock(createdAt)}`,
    });
    expect(line.metadata).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
    expect(line.metadata).not.toMatch(/\d+m/);

    const hidden = callHistoryLine({
      historyLabel: "call:6fbe4e97-d41b-4859-bd20-78b717be7998",
      peerName: "6fbe4e97-d41b-4859-bd20-78b717be7998",
    });
    expect(hidden).toEqual({ name: "Call", metadata: "Call" });
  });

  it("derives a different human outcome for the caller and the recipient", () => {
    expect(
      callHistoryLabel({ status: "canceled", endedReason: "canceled", viewer: "caller" }),
    ).toBe("Canceled call");
    expect(
      callHistoryLabel({ status: "canceled", endedReason: "canceled", viewer: "callee" }),
    ).toBe("Missed call");
    expect(
      callHistoryLabel({ status: "ended", endedReason: "declined", viewer: "caller" }),
    ).toBe("Call declined");
    expect(
      callHistoryLabel({ status: "ended", endedReason: "declined", viewer: "callee" }),
    ).toBe("Declined call");
    expect(
      callHistoryLabel({ status: "missed", endedReason: "missed", viewer: "caller" }),
    ).toBe("No answer");
    expect(
      callHistoryLabel({ status: "missed", endedReason: "missed", viewer: "callee" }),
    ).toBe("Missed call");
    expect(
      callHistoryLabel({
        status: "ended",
        endedReason: "hangup",
        mediaConnectedAt: "2026-09-28T01:49:32.644Z",
        endedAt: "2026-09-28T01:49:40.141Z",
        viewer: "callee",
      }),
    ).toBe("Audio call · 7s");
    expect(
      callHistoryLabel({
        status: "canceled",
        endedReason: "canceled",
        viewer: "callee",
      }),
    ).not.toMatch(/\d+s|\d+m/);
  });
});
