import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyCallInbox } from "../opalUi/callLifecycle";
import {
  CallClient,
  resetMicAcquisitionLog,
  tapCallMicrophone,
  micAcquisitionLog,
} from "./CallClient";

class FakeTrack {
  kind = "audio";
  enabled = true;
  readyState: "live" | "ended" = "live";
  stops = 0;
  stop() {
    this.stops += 1;
    this.readyState = "ended";
  }
  clone() {
    return new FakeTrack();
  }
}

class FakeStream {
  constructor(public tracks: FakeTrack[]) {}
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
}

class FakePeer {
  static all: FakePeer[] = [];
  signalingState = "stable";
  iceConnectionState = "new";
  localDescription: { type?: string; sdp?: string } | null = null;
  remoteDescription: { type?: string } | null = null;
  added: FakeTrack[] = [];
  ontrack: ((ev: { streams: FakeStream[] }) => void) | null = null;
  onicecandidate: ((ev: { candidate: { toJSON: () => { candidate: string } } | null }) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  closed = false;

  constructor() {
    FakePeer.all.push(this);
  }

  addTrack(track: FakeTrack) {
    this.added.push(track);
  }

  close() {
    this.closed = true;
    this.iceConnectionState = "closed";
  }

  async createOffer() {
    return { type: "offer", sdp: "offer" };
  }

  async createAnswer() {
    return { type: "answer", sdp: "answer" };
  }

  async setLocalDescription(desc: { type?: string; sdp?: string }) {
    this.localDescription = desc;
    this.signalingState = desc.type === "offer" ? "have-local-offer" : "stable";
  }

  async setRemoteDescription(desc: { type?: string }) {
    this.remoteDescription = desc;
    this.signalingState = "stable";
  }

  async addIceCandidate() {}

  connect() {
    this.iceConnectionState = "connected";
    this.oniceconnectionstatechange?.();
  }
}

function linkedChannels() {
  const handlers: Record<"a" | "b", ((msg: unknown) => void) | null> = { a: null, b: null };
  const left: Record<"a" | "b", number> = { a: 0, b: 0 };
  const make = (self: "a" | "b", other: "a" | "b") => ({
    on(event: string, cb: (msg: unknown) => void) {
      if (event === "signal") handlers[self] = cb;
    },
    off() {
      left[self] += 1;
      handlers[self] = null;
    },
    push(_event: string, payload: unknown) {
      queueMicrotask(() => handlers[other]?.(payload));
      return { receive() { return this; } };
    },
  });
  return { a: make("a", "b"), b: make("b", "a"), left };
}

let gum = 0;

function installBrowser() {
  gum = 0;
  FakePeer.all = [];
  (globalThis as { MediaStream?: unknown }).MediaStream = FakeStream;
  (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection = FakePeer;
  const nav = globalThis.navigator as { mediaDevices?: { getUserMedia: (c: unknown) => Promise<FakeStream> } };
  const mediaDevices = {
    getUserMedia: async () => {
      gum += 1;
      return new FakeStream([new FakeTrack()]);
    },
  };
  if (nav) nav.mediaDevices = mediaDevices;
  else (globalThis as { navigator?: unknown }).navigator = { mediaDevices };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("call microphone and signaling", () => {
  afterEach(() => {
    resetMicAcquisitionLog();
  });

  it("INTEGRATED_CALL_MEDIA_WITH_ASSIST_INSTALLED_OFF", async () => {
    installBrowser();
    resetMicAcquisitionLog();
    const wire = linkedChannels();
    const caller = new CallClient({ polite: false, callId: "call-a" });
    const callee = new CallClient({ polite: true, callId: "call-b" });
    await caller.start(wire.a as never, true);
    await callee.start(wire.b as never, false);
    await flush();

    expect(gum).toBe(2);
    expect(micAcquisitionLog().filter((row) => row.owner === "CallClient")).toHaveLength(2);
    expect(FakePeer.all).toHaveLength(2);
    const offer = FakePeer.all[0];
    const answer = FakePeer.all[1];
    expect(offer?.localDescription?.type).toBe("offer");
    expect(answer?.localDescription?.type).toBe("answer");
    expect(offer?.remoteDescription?.type).toBe("answer");
    expect(wire.left.a).toBe(0);
    expect(wire.left.b).toBe(0);

    offer?.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: "from-a" }) } });
    answer?.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: "from-b" }) } });
    await flush();
    offer?.connect();
    answer?.connect();
    expect(caller.getState()).toBe("connected");
    expect(callee.getState()).toBe("connected");

    const original = offer?.added[0];
    expect(original?.readyState).toBe("live");
    const tap = tapCallMicrophone("call-a");
    expect(gum).toBe(2);
    expect(tap?.getAudioTracks()[0]).not.toBe(original);
    tap?.getTracks().forEach((track) => track.stop());
    expect(original?.readyState).toBe("live");
    expect(original?.stops).toBe(0);

    const closed = applyCallInbox({
      surface: {
        kind: "audio",
        direction: "outgoing",
        peerName: "Walk B",
        liveCallId: "call-a",
        liveCallStatus: "answered",
      },
      note: null,
      event: { event: "ended", call_id: "call-a", reason: "hangup" },
    });
    expect(closed.surface).toBeNull();
    await callee.stop();
    await caller.stop();
    expect(original?.stops).toBe(1);
    expect(original?.readyState).toBe("ended");
    expect(tapCallMicrophone("call-a")).toBeNull();
  });

  it("INTEGRATED_CALL_MEDIA_WITH_ASSIST_ACTIVE keeps the same peer and track", async () => {
    installBrowser();
    resetMicAcquisitionLog();
    const wire = linkedChannels();
    const caller = new CallClient({ polite: false, callId: "call-live" });
    const callee = new CallClient({ polite: true, callId: "call-live-b" });
    await caller.start(wire.a as never, true);
    await callee.start(wire.b as never, false);
    await flush();
    FakePeer.all[0]?.connect();
    FakePeer.all[1]?.connect();
    const pc = FakePeer.all[0];
    const track = pc?.added[0];
    const before = gum;
    caller.setMuted(false);
    const tap = tapCallMicrophone("call-live");
    expect(gum).toBe(before);
    expect(tap).not.toBeNull();
    expect(track?.readyState).toBe("live");
    expect(pc?.closed).toBe(false);
    expect(caller.getState()).toBe("connected");
    caller.setMuted(true);
    expect(tapCallMicrophone("call-live")).toBeNull();
    expect(track?.readyState).toBe("live");
    expect(track?.enabled).toBe(false);
    await caller.stop();
    await callee.stop();
    expect(track?.stops).toBe(1);
  });

  it("ONE_MIC_PERMISSION_ACQUISITION_PER_CALL and ASSIST_ENABLE_DOES_NOT_CALL_GET_USER_MEDIA", async () => {
    installBrowser();
    resetMicAcquisitionLog();
    const wire = linkedChannels();
    const caller = new CallClient({ polite: false, callId: "call-one" });
    await caller.start(wire.a as never, true);
    expect(micAcquisitionLog()).toEqual([
      expect.objectContaining({ owner: "CallClient", callId: "call-one", constraints: "audio", result: "granted" }),
    ]);
    tapCallMicrophone("call-one");
    tapCallMicrophone("call-one");
    expect(gum).toBe(1);
    const assist = readFileSync(resolve(__dirname, "../opalUi/callAssist.tsx"), "utf8");
    expect(assist).not.toContain("getUserMedia");
    expect(assist).toContain("tapCallMicrophone");
    expect(assist).toContain("mutedRef.current");
    await caller.stop();
  });
});
