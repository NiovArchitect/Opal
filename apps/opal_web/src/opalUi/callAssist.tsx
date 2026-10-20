import React from "react";
import {
  getCallAssist,
  grantCallTranscription,
  postCallTranscript,
  setCallAssist,
  type CallAssistState,
  type CallGraphingState,
} from "../api/productClient";
import { tapCallMicrophone } from "../realtime/CallClient";
import { GraphingLight, callCaptureTruth } from "./graphingLight";

type Props = {
  callId: string;
  bearer?: string;
  peerName: string;
  muted?: boolean;
  /** Cluster F: the connected surface (orbit trace) consumes the
   *  same server-derived graphing state this control renders.
   *  Reported verbatim on every refresh/write - never re-derived. */
  onGraphingChange?: (state: CallGraphingState) => void;
};

/**
 * Connected-call Assist only. The microphone transcribed here is this device's
 * mic. Remote playback is never sent. The provider key stays on the server.
 */
export function CallAssistControl({ callId, bearer, peerName, muted = false, onGraphingChange }: Props) {
  const [assist, setAssist] = React.useState<CallAssistState>("off");
  // Server-derived graphing state (one derivation, every surface). The
  // light renders this verbatim — it is never computed on the client.
  const [graphing, setGraphing] = React.useState<CallGraphingState>("off");
  const [accountDefault, setAccountDefault] = React.useState<boolean | null>(null);
  const [selfPaused, setSelfPaused] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const refreshRef = React.useRef<() => void>(() => {});
  const onGraphingChangeRef = React.useRef(onGraphingChange);
  onGraphingChangeRef.current = onGraphingChange;
  const assistRef = React.useRef<CallAssistState>("off");
  const mutedRef = React.useRef(muted);
  mutedRef.current = muted;

  React.useEffect(() => {
    assistRef.current = assist;
  }, [assist]);

  React.useEffect(() => {
    let stopped = false;
    let ws: WebSocket | null = null;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let timer = 0;

    const stopHearing = () => {
      recorder?.stop();
      recorder = null;
      ws?.close();
      ws = null;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const hear = async () => {
      if (stopped || assistRef.current !== "active" || mutedRef.current || ws) return;
      const media = tapCallMicrophone(callId);
      if (!media) return;
      stream = media;
      try {
        const grant = await grantCallTranscription(callId, bearer);
        if (stopped || assistRef.current !== "active" || mutedRef.current) {
          stopHearing();
          return;
        }
        const socket = new WebSocket(
          "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&interim_results=true&mip_opt_out=true",
          ["token", grant.access_token],
        );
        ws = socket;
        socket.onmessage = (event) => {
          let payload: {
            is_final?: boolean;
            speech_final?: boolean;
            channel?: { alternatives?: Array<{ transcript?: string; confidence?: number }> };
            start?: number;
            duration?: number;
          };
          try {
            payload = JSON.parse(String(event.data));
          } catch {
            return;
          }
          const alternative = payload.channel?.alternatives?.[0];
          const text = (alternative?.transcript || "").trim();
          const isFinal = payload.is_final === true || payload.speech_final === true;
          if (!text || !isFinal) return;
          const segmentId = `${callId}:${payload.start ?? Date.now()}:${text.slice(0, 24)}`;
          void postCallTranscript(
            callId,
            {
              text,
              final: true,
              provider_segment_id: segmentId,
              confidence: alternative?.confidence ?? null,
            },
            bearer,
          ).catch(() => setNote("Assist couldn't update the plan"));
        };
        socket.onerror = () => setNote("Assist couldn't hear this call");
        socket.onclose = () => {
          if (ws === socket) ws = null;
        };
        socket.onopen = () => {
          const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
          const mediaRecorder = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
          recorder = mediaRecorder;
          mediaRecorder.ondataavailable = (chunk) => {
            if (chunk.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(chunk.data);
          };
          mediaRecorder.start(250);
        };
        setNote(null);
      } catch {
        stopHearing();
        setNote("Assist couldn't hear this call");
      }
    };

    const tick = async () => {
      try {
        const next = await getCallAssist(callId, bearer);
        if (stopped) return;
        setAssist(next.assist);
        setGraphing(next.graphing);
        onGraphingChangeRef.current?.(next.graphing);
        setAccountDefault(next.account_default);
        setSelfPaused(next.self_paused);
        assistRef.current = next.assist;
        if (next.assist === "active" && !mutedRef.current) void hear();
        else stopHearing();
      } catch {
        if (!stopped) setNote("Assist couldn't refresh");
      }
      if (!stopped) timer = window.setTimeout(tick, 2000);
    };

    // The call channel broadcasts every graphing transition to all
    // participants (ActiveCallOverlay forwards it as this event). On a
    // broadcast for THIS call, refresh from the server projection at
    // once instead of waiting for the next poll — the light and the
    // other participant's light move together.
    refreshRef.current = () => {
      void (async () => {
        try {
          const next = await getCallAssist(callId, bearer);
          if (stopped) return;
          setAssist(next.assist);
          setGraphing(next.graphing);
          onGraphingChangeRef.current?.(next.graphing);
          setAccountDefault(next.account_default);
          setSelfPaused(next.self_paused);
          assistRef.current = next.assist;
          if (next.assist === "active" && !mutedRef.current) void hear();
          else stopHearing();
        } catch {
          /* the poll below remains the backstop */
        }
      })();
    };
    const onGraphingBroadcast = (event: Event) => {
      const detail = (event as CustomEvent<{ call_id?: string }>).detail;
      if (detail?.call_id === callId) refreshRef.current();
    };
    window.addEventListener("opal:call-graphing", onGraphingBroadcast);

    void tick();
    return () => {
      stopped = true;
      window.removeEventListener("opal:call-graphing", onGraphingBroadcast);
      window.clearTimeout(timer);
      stopHearing();
    };
  }, [bearer, callId, muted]);

  const choose = async (allowed: boolean, scope: "call" | "account") => {
    try {
      const next = await setCallAssist(callId, allowed, bearer, scope);
      setAssist(next.assist);
      setGraphing(next.graphing);
      onGraphingChangeRef.current?.(next.graphing);
      setAccountDefault(next.account_default);
      setSelfPaused(next.self_paused);
      assistRef.current = next.assist;
      setNote(null);
    } catch {
      setNote("Assist couldn't update");
    }
  };

  const firstChoice = accountDefault === null && assist === "off" && !selfPaused;
  // One control, correct for the state the server reports (Apple
  // restraint: the pause/resume journey is a single button whose words
  // are the state it will produce, plus a plain sentence when the other
  // participant is the one holding the pause — nobody can resume
  // someone else's consent, and the surface says so instead of
  // pretending a tap could).
  const peerPaused = graphing === "paused" && !selfPaused;
  const label = graphing === "graphing"
    ? "Pause graphing"
    : selfPaused
      ? "Resume graphing"
      : peerPaused
        ? `Paused by ${peerName}`
        : assist === "waiting_for_other"
          ? `Waiting for ${peerName}`
          : "Enable Assist";

  return (
    <div className="live-call-assist" data-testid="call-assist" data-assist-state={assist}>
      <GraphingLight state={graphing} peerName={peerName} />
      <p className="live-call-assist-note" data-testid="call-capture-truth" role="status">
        {callCaptureTruth(graphing)}
      </p>
      {firstChoice ? (
        <p className="live-call-assist-note">
          With your say-so, Opal Assist transcribes this call to help with plans. Raw audio is not saved.
        </p>
      ) : null}
      <button
        type="button"
        data-testid="call-assist-toggle"
        data-graphing-action={
          graphing === "graphing" ? "pause" : selfPaused ? "resume" : peerPaused ? "held-by-peer" : "enable"
        }
        onClick={() => {
          if (graphing === "graphing") void choose(false, "call");
          else if (selfPaused) void choose(true, "call");
          else if (peerPaused) return;
          else if (assist === "waiting_for_other") return;
          else void choose(true, "account");
        }}
      >
        {label}
      </button>
      {peerPaused ? (
        <p className="live-call-assist-note" data-testid="call-graphing-held-note">
          {peerName} paused graphing for this call. Only they can resume their side.
        </p>
      ) : null}
      {firstChoice ? (
        <button type="button" data-testid="call-assist-not-now" onClick={() => void choose(false, "account")}>
          Not now
        </button>
      ) : null}
      {note ? (
        <p className="live-call-assist-note" data-testid="call-assist-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
