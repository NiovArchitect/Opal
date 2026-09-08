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

type SignalHandler = (msg: { type: string; payload: unknown; from_user_id?: string }) => void;

export class CallClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private channel: Channel | null = null;
  private state: CallClientState = "idle";
  private stateHandlers = new Set<(s: CallClientState) => void>();
  private remoteAudio: HTMLAudioElement | null = null;
  private polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;

  constructor(opts?: { polite?: boolean }) {
    this.polite = opts?.polite ?? true;
  }

  onState(handler: (s: CallClientState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  getState(): CallClientState {
    return this.state;
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
    } catch {
      this.setState("failed");
      throw new Error("microphone_denied");
    }

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
    this.channel?.off("signal");
    this.pc?.close();
    this.pc = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
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
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.pushSignal("answer", this.pc.localDescription);
      } else if (type === "answer") {
        await this.pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
      } else if (type === "ice") {
        try {
          await this.pc.addIceCandidate(msg.payload as RTCIceCandidateInit);
        } catch {
          if (!this.ignoreOffer) throw new Error("ice_failed");
        }
      }
    } catch {
      this.setState("failed");
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

/** Join call:<id> on an existing Phoenix socket. */
export function joinCallChannel(socket: Socket, callId: string): Promise<Channel> {
  return new Promise((resolve, reject) => {
    const ch = socket.channel(`call:${callId}`, {});
    ch.join()
      .receive("ok", () => resolve(ch))
      .receive("error", (err: unknown) => reject(err))
      .receive("timeout", () => reject(new Error("join_timeout")));
  });
}
