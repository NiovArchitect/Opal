/**
 * One visible call model. Server status and WebRTC state stay separate.
 * The screen copies and buttons all come from this result.
 */

import { formatHistoryInstant } from "./historyTime";

export type CallMedia = "idle" | "connecting" | "connected" | "failed" | "denied";

export type CallView = {
  phase: "incoming_ringing" | "outgoing_ringing" | "connecting" | "connected" | "failed";
  status: string;
  showAccept: boolean;
  showDecline: boolean;
  showCancel: boolean;
  showEnd: boolean;
  showMute: boolean;
  showTimer: boolean;
};

export function deriveCallView(input: {
  role: "caller" | "callee";
  serverStatus: string;
  locallyAccepted?: boolean;
  media: CallMedia;
}): CallView {
  const answered =
    input.serverStatus === "answered" ||
    (input.role === "callee" && input.locallyAccepted === true);
  if (input.media === "failed" || input.media === "denied") {
    return view("failed", input.media === "denied"
      ? "Microphone access is needed for calls."
      : "Couldn't connect the call.", false);
  }
  if (input.media === "connected") {
    return view("connected", "", true);
  }
  if (answered || input.media === "connecting") {
    return view("connecting", "Connecting audio…", false);
  }
  if (input.role === "callee") {
    return {
      phase: "incoming_ringing",
      status: "Incoming call",
      showAccept: true,
      showDecline: true,
      showCancel: false,
      showEnd: false,
      showMute: false,
      showTimer: false,
    };
  }
  return {
    phase: "outgoing_ringing",
    status: "Calling…",
    showAccept: false,
    showDecline: false,
    showCancel: true,
    showEnd: false,
    showMute: false,
    showTimer: false,
  };
}

function view(phase: CallView["phase"], status: string, live: boolean): CallView {
  const connected = phase === "connected";
  const connecting = phase === "connecting";
  return {
    phase,
    status,
    showAccept: false,
    showDecline: false,
    showCancel: false,
    showEnd: connected || connecting || phase === "failed",
    showMute: live && connected,
    showTimer: connected,
  };
}

const CALL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Local history time. Empty when the timestamp is missing or unreadable. */
export function formatCallClock(iso?: string | null, now = new Date()): string {
  if (!iso) return "";
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return formatHistoryInstant(when, now);
}

function humanCallText(value: string | null | undefined, fallback: string): string {
  const text = (value || "").trim();
  if (!text || text.startsWith("call:") || CALL_UUID.test(text)) return fallback;
  return text;
}

/** Calls row copy. Duration stays inside historyLabel and only exists after media connected. */
export function callHistoryLine(input: {
  historyLabel?: string | null;
  createdAt?: string | null;
  peerName?: string | null;
}): { name: string; metadata: string } {
  const name = humanCallText(input.peerName, "Call");
  const label = humanCallText(input.historyLabel, "Call");
  const when = formatCallClock(input.createdAt);
  return { name, metadata: when ? `${label} · ${when}` : label };
}

export function callHistoryLabel(input: {
  status: string;
  endedReason?: string | null;
  mediaConnectedAt?: string | null;
  endedAt?: string | null;
  viewer?: "caller" | "callee";
}): string {
  const incoming = input.viewer === "callee";
  const reason = input.endedReason || "";
  if (input.mediaConnectedAt && input.endedAt) {
    const seconds = Math.max(
      0,
      Math.round((Date.parse(input.endedAt) - Date.parse(input.mediaConnectedAt)) / 1000),
    );
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `Audio call · ${minutes}m ${rest}s` : `Audio call · ${rest}s`;
  }
  if (reason === "media_failed" || reason === "failed" || reason === "mic_denied") {
    return "Call couldn't connect";
  }
  if (reason === "declined") return incoming ? "Declined call" : "Call declined";
  if (reason === "busy") return incoming ? "Call" : "Busy";
  if (reason === "canceled" || input.status === "canceled") {
    return incoming ? "Missed call" : "Canceled call";
  }
  if (reason === "missed" || reason === "ring_timeout" || input.status === "missed") {
    return incoming ? "Missed call" : "No answer";
  }
  if (input.status === "ended" || input.status === "answered") return "Call couldn't connect";
  return "Call";
}
