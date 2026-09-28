/**
 * Minimal live-call overlay — does not redesign P2 Continuity chrome.
 * Uses CallClient (STUN). Surfaces needs_turn honestly.
 * Caller waits for answered before creating the WebRTC offer.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Socket } from "phoenix";
import { CallClient, joinCallChannel } from "../realtime/CallClient";
import { type ProductCall } from "../api/productClient";

type Props = {
  call: ProductCall;
  socket: Socket;
  /** True if this client should create the WebRTC offer (caller after answer). */
  asOfferer: boolean;
  bearer?: string;
  onEnded: () => void;
  /** Fired when remote peer answers while we are still ringing. */
  onRemoteAnswered?: (call: ProductCall) => void;
  onMedia?: (state: "connecting" | "connected" | "failed" | "denied") => void;
  muted?: boolean;
};

export function ActiveCallOverlay({
  call,
  socket,
  asOfferer,
  bearer,
  onEnded,
  onRemoteAnswered,
  onMedia,
  muted = false,
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
      if (cancelled) return;
      setState(s);
      if (s === "connected") onMedia?.("connected");
      else if (s === "needs_turn" || s === "failed") onMedia?.("failed");
      else if (s === "acquiring_media" || s === "connecting") onMedia?.("connecting");
    });

    (async () => {
      try {
        // Re-join (or join) for media signaling after answer.
        const ch = await joinCallChannel(socket, call.id);
        if (cancelled) return;
        client.setRemoteAudioElement(audioRef.current);
        await client.start(ch, asOfferer);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "call_failed";
        setError(message);
        onMedia?.(message === "microphone_denied" ? "denied" : "failed");
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
    clientRef.current?.setMuted(muted);
  });

  useEffect(() => {
    if (!mediaReady || state === "connected" || state === "failed" || state === "ended") return;
    const timer = window.setTimeout(() => onMedia?.("failed"), 20_000);
    return () => window.clearTimeout(timer);
  }, [mediaReady, state, onMedia]);

  return (
    <div hidden data-testid="active-call-overlay" data-call-state={state} data-call-error={error || undefined}>
      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}
