/**
 * Media runtime belongs to one call id.
 * A previous call is history. It is never state for the next call.
 * Call session, media, and Assist stay separate machines.
 * Diagnostics are ephemeral and never include SDP or audio.
 */

export const MEDIA_FAILURE_COPY = "Couldn't connect the call.";
export const HISTORY_FAILURE_COPY = "Call couldn't connect";

export type MediaState =
  | "not_started"
  | "acquiring_mic"
  | "signaling"
  | "connecting"
  | "connected"
  | "failed"
  | "closed";

export type MediaRuntime = {
  callId: string;
  mediaState: MediaState;
  mediaError: string | null;
  needsTurn: boolean;
  connectStartedAt: number | null;
  connectedAt: number | null;
  timerCallId: string | null;
  peerGeneration: number;
};

export type LiveMediaSignal = "connecting" | "connected" | "failed" | "denied";

export type CallMediaDiag = {
  callId: string;
  at: number;
  event: string;
  signalingState?: string;
  iceGatheringState?: string;
  iceConnectionState?: string;
  connectionState?: string;
};

const diagBuffer: CallMediaDiag[] = [];
const DIAG_LIMIT = 200;

export function createMediaRuntime(callId: string): MediaRuntime {
  return {
    callId,
    mediaState: "not_started",
    mediaError: null,
    needsTurn: false,
    connectStartedAt: null,
    connectedAt: null,
    timerCallId: null,
    peerGeneration: 0,
  };
}

/** A new call id starts clean. The previous runtime is not copied. */
export function replaceCallRuntime(_previous: MediaRuntime | null, nextCallId: string): MediaRuntime {
  return createMediaRuntime(nextCallId);
}

/** Media negotiation waits until this call is answered. */
export function mediaMayStart(input: { role: "caller" | "callee"; serverStatus: string }): boolean {
  return input.serverStatus === "answered";
}

export function beginMedia(runtime: MediaRuntime, callId: string, now: number): MediaRuntime {
  if (runtime.callId !== callId) return runtime;
  if (runtime.mediaState !== "not_started") return runtime;
  return {
    ...runtime,
    mediaState: "acquiring_mic",
    mediaError: null,
    needsTurn: false,
    connectStartedAt: now,
    connectedAt: null,
    timerCallId: callId,
    peerGeneration: runtime.peerGeneration + 1,
  };
}

export function applyMediaSignal(
  runtime: MediaRuntime,
  event: { callId: string; signal: LiveMediaSignal | "closed"; reason?: string; now?: number },
): MediaRuntime {
  if (event.callId !== runtime.callId) return runtime;
  if (runtime.mediaState === "not_started" && (event.signal === "failed" || event.signal === "denied")) {
    return runtime;
  }
  if (event.signal === "connecting") {
    if (runtime.mediaState === "failed" || runtime.mediaState === "connected" || runtime.mediaState === "closed") {
      return runtime;
    }
    if (runtime.mediaState === "not_started") return runtime;
    return { ...runtime, mediaState: "connecting", mediaError: null, needsTurn: false };
  }
  if (event.signal === "connected") {
    if (
      runtime.mediaState === "failed" ||
      runtime.mediaState === "closed" ||
      runtime.mediaState === "not_started"
    ) {
      return runtime;
    }
    return {
      ...runtime,
      mediaState: "connected",
      mediaError: null,
      needsTurn: false,
      connectedAt: event.now ?? runtime.connectedAt,
      timerCallId: null,
    };
  }
  if (event.signal === "failed" || event.signal === "denied") {
    if (runtime.mediaState === "connected" || runtime.mediaState === "closed" || runtime.mediaState === "not_started") {
      return runtime;
    }
    const reason = event.reason || (event.signal === "denied" ? "microphone_denied" : "media_failed");
    return {
      ...runtime,
      mediaState: "failed",
      mediaError: reason,
      needsTurn: reason === "needs_turn",
      timerCallId: null,
    };
  }
  if (event.signal === "closed") {
    if (runtime.mediaState === "not_started") return runtime;
    return { ...runtime, mediaState: "closed", timerCallId: null };
  }
  return runtime;
}

/**
 * Events that arrive before this call is answered, or for another id, do nothing.
 * Failure cannot be recorded until media for this id has started.
 */
export function reduceLiveMedia(
  runtime: MediaRuntime,
  event: {
    callId: string;
    signal: LiveMediaSignal;
    reason?: string;
    accepted: boolean;
    now: number;
  },
): MediaRuntime {
  if (event.callId !== runtime.callId || !event.accepted) return runtime;
  let next = runtime;
  if (next.mediaState === "not_started") {
    if (event.signal === "failed" || event.signal === "denied") return runtime;
    next = beginMedia(next, event.callId, event.now);
  }
  const signal = event.signal === "denied" ? "denied" : event.signal;
  return applyMediaSignal(next, {
    callId: event.callId,
    signal,
    reason: event.reason || (event.signal === "denied" ? "microphone_denied" : undefined),
    now: event.now,
  });
}

/** A timer stamped with another call id cannot fail the call on screen. */
export function fireMediaTimeout(runtime: MediaRuntime, timerCallId: string, now = 0): MediaRuntime {
  if (timerCallId !== runtime.callId) return runtime;
  if (runtime.timerCallId !== timerCallId) return runtime;
  if (runtime.connectStartedAt == null) return runtime;
  if (
    runtime.mediaState === "not_started" ||
    runtime.mediaState === "connected" ||
    runtime.mediaState === "failed" ||
    runtime.mediaState === "closed"
  ) {
    return runtime;
  }
  return applyMediaSignal(runtime, {
    callId: timerCallId,
    signal: "failed",
    reason: "media_timeout",
    now,
  });
}

/**
 * Cleanup for call N closes call N only.
 * A callback that still carries N must not close N+1.
 */
export function cleanupPeer(
  runtime: MediaRuntime,
  cleanupCallId: string,
  currentCallId: string,
): { runtime: MediaRuntime; closed: boolean } {
  if (cleanupCallId !== currentCallId || runtime.callId !== currentCallId) {
    return { runtime, closed: false };
  }
  if (runtime.mediaState === "not_started") {
    return { runtime: { ...runtime, timerCallId: null }, closed: true };
  }
  return {
    closed: true,
    runtime: { ...runtime, mediaState: "closed", timerCallId: null },
  };
}

export function peerEventApplies(disposed: boolean, ownerCallId: string, eventCallId: string): boolean {
  return !disposed && ownerCallId !== "" && ownerCallId === eventCallId;
}

export type CallMediaView = "idle" | "connecting" | "connected" | "failed" | "denied";

export function callMediaFromRuntime(runtime: MediaRuntime | null, callId?: string): CallMediaView {
  if (!runtime || !callId || runtime.callId !== callId) return "idle";
  if (runtime.mediaState === "failed" && runtime.mediaError === "microphone_denied") return "denied";
  switch (runtime.mediaState) {
    case "acquiring_mic":
    case "signaling":
    case "connecting":
      return "connecting";
    case "connected":
      return "connected";
    case "failed":
      return "failed";
    default:
      return "idle";
  }
}

/** Media failure is the failed phase itself, never a second line under Incoming or Connecting. */
export function overlayCallNote(phase: string, note: string | null | undefined): string | null {
  if (!note) return null;
  if (note === MEDIA_FAILURE_COPY || note === HISTORY_FAILURE_COPY) return null;
  if (phase === "incoming_ringing" && note === "Couldn't answer") return note;
  return null;
}

export function recordCallDiag(entry: CallMediaDiag): void {
  diagBuffer.push({
    callId: entry.callId,
    at: entry.at,
    event: entry.event,
    signalingState: entry.signalingState,
    iceGatheringState: entry.iceGatheringState,
    iceConnectionState: entry.iceConnectionState,
    connectionState: entry.connectionState,
  });
  if (diagBuffer.length > DIAG_LIMIT) diagBuffer.splice(0, diagBuffer.length - DIAG_LIMIT);
}

export function callDiagSnapshot(callId?: string): CallMediaDiag[] {
  const rows = callId ? diagBuffer.filter((row) => row.callId === callId) : diagBuffer;
  return rows.map((row) => ({ ...row }));
}

export function resetCallDiag(): void {
  diagBuffer.length = 0;
}

export function installCallDiagHook(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const host = window as Window & { __opalCallMediaDiag?: () => CallMediaDiag[] };
  host.__opalCallMediaDiag = () => callDiagSnapshot();
  return () => {
    delete host.__opalCallMediaDiag;
  };
}
