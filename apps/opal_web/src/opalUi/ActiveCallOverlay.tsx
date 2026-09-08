/**
 * Minimal live-call overlay — does not redesign P2 Continuity chrome.
 * Uses CallClient (STUN). Surfaces needs_turn honestly.
 * Caller waits for answered before creating the WebRTC offer.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Socket } from "phoenix";
import { CallClient, joinCallChannel } from "../realtime/CallClient";
import { hangupCall, type ProductCall } from "../api/productClient";

type Props = {
  call: ProductCall;
  socket: Socket;
  /** True if this client should create the WebRTC offer (caller after answer). */
  asOfferer: boolean;
  bearer?: string;
  onEnded: () => void;
  /** Fired when remote peer answers while we are still ringing. */
  onRemoteAnswered?: (call: ProductCall) => void;
};

export function ActiveCallOverlay({
  call,
  socket,
  asOfferer,
  bearer,
  onEnded,
  onRemoteAnswered,
}: Props) {
  const [state, setState] = useState(
    call.status === "ringing" && asOfferer ? "waiting_answer" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(call.status === "answered");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clientRef = useRef<CallClient | null>(null);

  // Caller: join call channel and wait for answered before media.
  useEffect(() => {
    if (call.status === "answered") {
      setMediaReady(true);
      return;
    }
    if (!asOfferer || call.status !== "ringing") return;

    let cancelled = false;
    let ch: Awaited<ReturnType<typeof joinCallChannel>> | null = null;

    (async () => {
      try {
        ch = await joinCallChannel(socket, call.id);
        if (cancelled) return;
        ch.on("answered", () => {
          if (cancelled) return;
          setMediaReady(true);
          onRemoteAnswered?.({ ...call, status: "answered" });
        });
        ch.on("ended", () => {
          if (!cancelled) onEnded();
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "call_join_failed");
      }
    })();

    return () => {
      cancelled = true;
      try {
        ch?.leave();
      } catch {
        /* ignore */
      }
    };
  }, [call.id, call.status, socket, asOfferer, onEnded, onRemoteAnswered, call]);

  // Media path once answered.
  useEffect(() => {
    if (!mediaReady) return;
    let cancelled = false;
    const client = new CallClient({ polite: !asOfferer });
    clientRef.current = client;
    const off = client.onState((s) => {
      if (!cancelled) setState(s);
    });

    (async () => {
      try {
        // Re-join (or join) for media signaling after answer.
        const ch = await joinCallChannel(socket, call.id);
        if (cancelled) return;
        client.setRemoteAudioElement(audioRef.current);
        await client.start(ch, asOfferer);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "call_failed");
      }
    })();

    return () => {
      cancelled = true;
      off();
      void client.stop();
    };
  }, [mediaReady, call.id, socket, asOfferer]);

  // Keep remote audio element attached if it mounts after start.
  useEffect(() => {
    clientRef.current?.setRemoteAudioElement(audioRef.current);
  });

  async function hangup() {
    try {
      await hangupCall(call.id, "hangup", bearer);
    } catch {
      /* still end local */
    }
    await clientRef.current?.stop();
    onEnded();
  }

  return (
    <div
      className="opal-active-call-overlay"
      data-testid="active-call-overlay"
      data-call-state={state}
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 24,
        zIndex: 80,
        padding: "14px 16px",
        borderRadius: 16,
        background: "rgba(8,12,22,0.92)",
        border: "1px solid rgba(139,92,246,0.45)",
        color: "#f3f0ff",
      }}
    >
      <audio ref={audioRef} autoPlay playsInline />
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {state === "waiting_answer"
          ? "Ringing…"
          : state === "connected"
            ? "Connected"
            : state === "needs_turn"
              ? "Needs TURN (NAT)"
              : state === "connecting" || state === "acquiring_media"
                ? "Connecting…"
                : state === "failed"
                  ? "Call failed"
                  : mediaReady
                    ? "In call"
                    : "Ringing…"}
      </div>
      <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10 }}>
        {state === "needs_turn"
          ? "Audio path needs a TURN relay on this network — signaling is real; media incomplete."
          : "1:1 audio · STUN only · Continuity chrome unchanged"}
      </div>
      {error ? (
        <div style={{ fontSize: 11, color: "#fca5a5", marginBottom: 8 }}>{error}</div>
      ) : null}
      <button
        type="button"
        data-testid="active-call-hangup"
        onClick={() => void hangup()}
        style={{
          height: 36,
          padding: "0 14px",
          borderRadius: 12,
          border: 0,
          background: "#ef4444",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        End call
      </button>
    </div>
  );
}
