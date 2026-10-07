/**
 * WebRTC 1:1 audio client (R3-early + Phase 1 TURN).
 *
 * ICE servers: fetch Twilio NTS credentials via
 * POST /api/v1/product/calls/:id/turn-credentials before creating RTCPeerConnection.
 * When TURN is disabled, fall back to public STUN (same-network only) and log clearly.
 * Signaling stays on Phoenix call:<id> (offer/answer/ICE) — not rebuilt here.
 */

import type { Channel, Socket } from "phoenix";

export type CallIceServers = RTCIceServer[];

/** Public STUN — used only when TURN is not configured. NAT traversal may fail. */
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

export type TurnCredentialsResult = {
  iceServers: CallIceServers;
  ttl?: number;
  source?: string;
  disabled?: boolean;
};

export type FetchTurnCredentials = (callId: string) => Promise<TurnCredentialsResult>;

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

function normalizeIceServers(raw: unknown): CallIceServers {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const urls = (e.urls ?? e.url) as string | string[] | undefined;
      if (!urls) return null;
      const server: RTCIceServer = { urls };
      if (typeof e.username === "string" && e.username) server.username = e.username;
      if (typeof e.credential === "string" && e.credential) server.credential = e.credential;
      return server;
    })
    .filter((s): s is RTCIceServer => s != null);
}

/** Filter to TURN/TURNS only — used by relay-forced connectivity tests. */
export function turnOnlyIceServers(servers: CallIceServers): CallIceServers {
  return servers.filter((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => typeof u === "string" && /^turns?:/i.test(u));
  });
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
  private iceServers: CallIceServers = PUBLIC_STUN_SERVERS;
  private fetchTurn: FetchTurnCredentials | null = null;
  private iceRestartAttempted = false;
  private turnDisabled = false;

  constructor(opts?: {
    polite?: boolean;
    callId?: string;
    iceServers?: CallIceServers;
    fetchTurnCredentials?: FetchTurnCredentials;
  }) {
    this.polite = opts?.polite ?? true;
    this.callId = opts?.callId ?? "";
    if (opts?.iceServers?.length) this.iceServers = opts.iceServers;
    if (opts?.fetchTurnCredentials) this.fetchTurn = opts.fetchTurnCredentials;
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

  getIceServers(): CallIceServers {
    return this.iceServers;
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

    await this.resolveIceServers();

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

    this.createPeerConnection();

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

  private async resolveIceServers(): Promise<void> {
    if (!this.fetchTurn || !this.callId) {
      console.info("[opal-call] ICE using provided/public STUN — no TURN fetcher", {
        callId: this.callId,
      });
      return;
    }

    try {
      const result = await this.fetchTurn(this.callId);
      if (result.disabled || !result.iceServers?.length) {
        this.turnDisabled = true;
        this.iceServers = PUBLIC_STUN_SERVERS;
        console.warn(
          "[opal-call] TURN disabled — falling back to STUN-only (same-network OK; cross-NAT likely fails)",
          { callId: this.callId, source: result.source },
        );
        return;
      }
      this.iceServers = result.iceServers;
      this.turnDisabled = false;
      const hasTurn = turnOnlyIceServers(result.iceServers).length > 0;
      console.info("[opal-call] ICE servers loaded", {
        callId: this.callId,
        count: result.iceServers.length,
        hasTurn,
        ttl: result.ttl,
        source: result.source,
      });
    } catch (err) {
      this.turnDisabled = true;
      this.iceServers = PUBLIC_STUN_SERVERS;
      console.warn("[opal-call] TURN fetch failed — STUN-only fallback", {
        callId: this.callId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: this.iceServers });
    for (const track of this.localStream?.getTracks() || []) {
      this.pc.addTrack(track, this.localStream!);
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
      console.info("[opal-call] ICE state", { callId: this.callId, ice });
      if (ice === "connected" || ice === "completed") this.setState("connected");
      if (ice === "failed") {
        void this.onIceFailed();
      }
      if (ice === "closed" || ice === "disconnected") {
        /* keep needs_turn/connected until hangup */
      }
    };
  }

  /** One ICE restart with fresh TURN credentials before giving up. */
  private async onIceFailed(): Promise<void> {
    if (this.iceRestartAttempted) {
      console.warn("[opal-call] ICE failed after restart — giving up", { callId: this.callId });
      this.setState(this.turnDisabled ? "needs_turn" : "failed");
      this.channel?.push("needs_turn", {});
      return;
    }

    this.iceRestartAttempted = true;
    console.info("[opal-call] ICE failed — attempting one restart with fresh TURN", {
      callId: this.callId,
    });

    try {
      if (this.fetchTurn && this.callId) {
        const result = await this.fetchTurn(this.callId);
        if (result.iceServers?.length && !result.disabled) {
          this.iceServers = result.iceServers;
        }
      }
      if (!this.pc) return;
      // Apply new ICE servers via setConfiguration when supported, then restartIce.
      try {
        this.pc.setConfiguration({ iceServers: this.iceServers });
      } catch {
        /* some browsers reject mid-call setConfiguration — restartIce still helps */
      }
      this.pc.restartIce();
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.pushSignal("offer", this.pc.localDescription);
      console.info("[opal-call] ICE restart offer sent", { callId: this.callId });
    } catch (err) {
      console.warn("[opal-call] ICE restart failed", {
        callId: this.callId,
        err: err instanceof Error ? err.message : String(err),
      });
      this.setState("failed");
      this.channel?.push("needs_turn", {});
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
      } else if (type === "hold") {
        // Peer hold signal — mute outbound while held (Phase 3 CallKit hold).
        const held = Boolean((msg.payload as { held?: boolean })?.held);
        this.setMuted(held);
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

  /** Signal hold to peer via existing Phoenix channel. */
  signalHold(held: boolean) {
    this.pushSignal("hold", { held });
    this.setMuted(held);
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
