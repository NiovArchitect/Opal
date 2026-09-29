/**
 * WebRTC 1:1 audio client (R3-early).
 * Public STUN only — TURN is a documented dependency when ICE fails.
 * Signaling payloads stay on Phoenix call:<id> channel (not Kafka).
 */

import type { Channel, Socket } from "phoenix";

export type CallIceServers = RTCIceServer[];

/** Public STUN — not TURN. NAT traversal may fail without TURN. */
export const PUBLIC_STUN_SERVERS: CallIceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type CallClientState =
  | "idle"
  | "acquiring_media"
  | "connecting"
  | "connected"
  | "needs_turn"
  | "ended"
  | "failed";

export function callChannelTopic(callId: string): string {
  return `call:${callId}`;
}

/** One live call microphone. Assist reads a clone. It never acquires its own. */
const liveCallMics = new Map<string, CallClient>();

export type MicInvocation = {
  owner: "CallClient";
  callId: string;
  at: number;
  constraints: "audio";
  result: "granted" | "denied";
};

const micInvocations: MicInvocation[] = [];

export function micAcquisitionLog(): MicInvocation[] {
  return micInvocations.map((row) => ({ ...row }));
}

export function resetMicAcquisitionLog(): void {
  micInvocations.length = 0;
}

export function tapCallMicrophone(callId: string): MediaStream | null {
  const client = liveCallMics.get(callId);
  if (!client || client.isMuted()) return null;
  return client.cloneLocalAudio();
}

export class CallClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private channel: Channel | null = null;
  private state: CallClientState = "idle";
  private stateHandlers = new Set<(s: CallClientState) => void>();
  private remoteAudio: HTMLAudioElement | null = null;
  private polite: boolean;
  private callId: string;
  private muted = false;
  private makingOffer = false;
  private ignoreOffer = false;
  private pendingIce: RTCIceCandidateInit[] = [];

  constructor(opts?: { polite?: boolean; callId?: string }) {
    this.polite = opts?.polite ?? true;
    this.callId = opts?.callId ?? "";
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** A separate track for Assist. Stopping the clone does not stop the call. */
  cloneLocalAudio(): MediaStream | null {
    const tracks = (this.localStream?.getAudioTracks() || []).filter((track) => track.readyState === "live");
    if (!tracks.length || typeof MediaStream === "undefined") return null;
    return new MediaStream(tracks.map((track) => track.clone()));
  }

  onState(handler: (s: CallClientState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  getState(): CallClientState {
    return this.state;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    for (const track of this.localStream?.getAudioTracks() || []) {
      track.enabled = !muted;
    }
  }

  /** Attach remote audio element (hidden is fine). */
  setRemoteAudioElement(el: HTMLAudioElement | null) {
    this.remoteAudio = el;
  }

  async start(channel: Channel, asOfferer: boolean): Promise<void> {
    this.channel = channel;
    this.setState("acquiring_media");

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micInvocations.push({
        owner: "CallClient",
        callId: this.callId,
        at: Date.now(),
        constraints: "audio",
        result: "granted",
      });
    } catch {
      micInvocations.push({
        owner: "CallClient",
        callId: this.callId,
        at: Date.now(),
        constraints: "audio",
        result: "denied",
      });
      this.setState("failed");
      throw new Error("microphone_denied");
    }
    if (this.callId) liveCallMics.set(this.callId, this);

    this.pc = new RTCPeerConnection({ iceServers: PUBLIC_STUN_SERVERS });
    for (const track of this.localStream.getTracks()) {
      this.pc.addTrack(track, this.localStream);
    }

    this.pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (this.remoteAudio && stream) {
        this.remoteAudio.srcObject = stream;
        void this.remoteAudio.play().catch(() => {});
      }
    };

    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.pushSignal("ice", ev.candidate.toJSON());
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const ice = this.pc?.iceConnectionState;
      if (ice === "connected" || ice === "completed") this.setState("connected");
      if (ice === "failed") {
        this.setState("needs_turn");
        this.channel?.push("needs_turn", {});
      }
      if (ice === "closed" || ice === "disconnected") {
        /* keep needs_turn/connected until hangup */
      }
    };

    channel.on("signal", (raw: unknown) => {
      const msg = (raw || {}) as { type?: string; payload?: unknown; from_user_id?: string };
      void this.onRemoteSignal(msg);
    });

    this.setState("connecting");
    if (asOfferer) {
      await this.makeOffer();
    } else {
      // Answerer joined: tell offerer to (re)send offer — avoids missed SDP if offer
      // was broadcast before this peer joined the call channel.
      this.pushSignal("ready", { ready: true });
    }
  }

  async stop(): Promise<void> {
    if (this.callId && liveCallMics.get(this.callId) === this) liveCallMics.delete(this.callId);
    this.channel?.off("signal");
    this.pc?.close();
    this.pc = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.channel = null;
    this.setState("ended");
  }

  private async makeOffer() {
    if (!this.pc) return;
    this.makingOffer = true;
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.pushSignal("offer", this.pc.localDescription);
    } finally {
      this.makingOffer = false;
    }
  }

  private async onRemoteSignal(msg: { type?: string; payload?: unknown }) {
    if (!this.pc || !msg.type) return;
    const type = msg.type;

    try {
      if (type === "ready") {
        // Peer is on-channel and ready for media — (re)offer if we are the offerer.
        if (!this.polite) await this.makeOffer();
        return;
      }

      if (msg.payload == null) return;

      if (type === "offer") {
        const offerCollision = this.makingOffer || this.pc.signalingState !== "stable";
        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) return;
        await this.pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
        await this.flushIce();
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.pushSignal("answer", this.pc.localDescription);
      } else if (type === "answer") {
        await this.pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
        await this.flushIce();
      } else if (type === "ice") {
        const candidate = msg.payload as RTCIceCandidateInit;
        if (!this.pc.remoteDescription) {
          this.pendingIce = queueIceBeforeRemote(this.pendingIce, candidate);
          return;
        }
        try {
          await this.pc.addIceCandidate(candidate);
        } catch {
          if (!this.ignoreOffer) throw new Error("ice_failed");
        }
      }
    } catch {
      this.setState("failed");
    }
  }

  private async flushIce() {
    const queued = this.pendingIce;
    this.pendingIce = [];
    for (const candidate of queued) {
      await this.pc?.addIceCandidate(candidate);
    }
  }

  private pushSignal(type: string, payload: unknown) {
    this.channel?.push("signal", { type, payload });
  }

  private setState(s: CallClientState) {
    this.state = s;
    this.stateHandlers.forEach((h) => h(s));
  }
}

/** Hold ICE that arrives before the remote description, then apply it in order. */
export function queueIceBeforeRemote(
  queued: RTCIceCandidateInit[],
  candidate: RTCIceCandidateInit,
): RTCIceCandidateInit[] {
  return [...queued, candidate];
}

/** Join call:<id> on an existing Phoenix socket. */
export function joinCallChannel(socket: Socket, callId: string): Promise<Channel> {
  return new Promise((resolve, reject) => {
    const ch = socket.channel(callChannelTopic(callId), {});
    ch.join()
      .receive("ok", () => resolve(ch))
      .receive("error", (err: unknown) => reject(err))
      .receive("timeout", () => reject(new Error("join_timeout")));
  });
}
