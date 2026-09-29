import React from "react";
import {
  getCallAssist,
  grantCallTranscription,
  postCallTranscript,
  setCallAssist,
  type CallAssistState,
} from "../api/productClient";
import { tapCallMicrophone } from "../realtime/CallClient";

type Props = {
  callId: string;
  bearer?: string;
  peerName: string;
  muted?: boolean;
};

/**
 * Connected-call Assist only. The microphone transcribed here is this device's
 * mic. Remote playback is never sent. The provider key stays on the server.
 */
export function CallAssistControl({ callId, bearer, peerName, muted = false }: Props) {
  const [assist, setAssist] = React.useState<CallAssistState>("off");
  const [accountDefault, setAccountDefault] = React.useState<boolean | null>(null);
  const [selfPaused, setSelfPaused] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
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

    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stopHearing();
    };
  }, [bearer, callId, muted]);

  const choose = async (allowed: boolean, scope: "call" | "account") => {
    try {
      const next = await setCallAssist(callId, allowed, bearer, scope);
      setAssist(next.assist);
      setAccountDefault(next.account_default);
      setSelfPaused(next.self_paused);
      assistRef.current = next.assist;
      setNote(null);
    } catch {
      setNote("Assist couldn't update");
    }
  };

  const firstChoice = accountDefault === null && assist === "off" && !selfPaused;
  const label = assist === "active"
    ? "Pause for this call"
    : selfPaused
      ? "Resume"
      : assist === "waiting_for_other"
        ? `Waiting for ${peerName}`
        : "Enable Assist";

  return (
    <div className="live-call-assist" data-testid="call-assist" data-assist-state={assist}>
      <p className="live-call-assist-kicker" data-testid="call-assist-indicator">
        {assist === "active" ? "Opal Assist on" : selfPaused ? "Opal Assist paused" : "Opal Assist"}
      </p>
      {firstChoice ? (
        <p className="live-call-assist-note">
          Opal Assist can listen during this call to help with plans. Raw audio is not saved.
        </p>
      ) : null}
      <button
        type="button"
        data-testid="call-assist-toggle"
        onClick={() => {
          if (assist === "active") void choose(false, "call");
          else if (selfPaused) void choose(true, "call");
          else if (assist === "waiting_for_other") return;
          else void choose(true, "account");
        }}
      >
        {label}
      </button>
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
