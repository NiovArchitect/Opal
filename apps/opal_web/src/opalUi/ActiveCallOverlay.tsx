/**
 * Hidden audio path for one call.
 * Media starts the moment this call is answered, the same way the
 * physically proven foreground call did. Assist does not own this path.
 * The media channel stays joined so a remote hangup can close this device.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Socket } from "phoenix";
import { CallClient, joinCallChannel, type TurnCredentialsResult } from "../realtime/CallClient";
import { fetchTurnCredentials, type ProductCall } from "../api/productClient";

type MediaNotice = "connecting" | "connected" | "failed" | "denied";

type Props = {
  call: ProductCall;
  socket: Socket;
  /** True if this client should create the WebRTC offer (caller after answer). */
  asOfferer: boolean;
  bearer?: string;
  onEnded: (callId: string) => void;
  /** Fired when remote peer answers while we are still ringing. */
  onRemoteAnswered?: (call: ProductCall) => void;
  onMedia?: (state: MediaNotice, callId: string) => void;
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
  const callIdRef = useRef(call.id);
  callIdRef.current = call.id;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onRemoteAnsweredRef = useRef(onRemoteAnswered);
  onRemoteAnsweredRef.current = onRemoteAnswered;
  const onMediaRef = useRef(onMedia);
  onMediaRef.current = onMedia;
  const callRef = useRef(call);
  callRef.current = call;

  // Caller joins call:<id> while ringing. Answered starts media immediately.
  useEffect(() => {
    if (call.status === "answered") {
      setMediaReady(true);
      return;
    }
    if (!asOfferer || call.status !== "ringing") return;

    const ownedId = call.id;
    let cancelled = false;
    let ch: Awaited<ReturnType<typeof joinCallChannel>> | null = null;

    (async () => {
      try {
        ch = await joinCallChannel(socket, ownedId);
        if (cancelled || callIdRef.current !== ownedId) {
          ch.leave();
          return;
        }
        ch.on("answered", () => {
          if (cancelled || callIdRef.current !== ownedId) return;
          setMediaReady(true);
          onRemoteAnsweredRef.current?.({ ...callRef.current, id: ownedId, status: "answered" });
        });
        ch.on("ended", () => {
          if (cancelled || callIdRef.current !== ownedId) return;
          onEndedRef.current(ownedId);
        });
      } catch (e) {
        if (!cancelled && callIdRef.current === ownedId) {
          setError(e instanceof Error ? e.message : "call_join_failed");
        }
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
  }, [call.id, call.status, socket, asOfferer]);

  // One media channel for this call. It is not left while the call is current,
  // so offer/answer/ICE and the remote ended event stay on the same join.
  useEffect(() => {
    if (!mediaReady) return;
    const ownedId = call.id;
    let cancelled = false;
    const turnFetcher = async (callId: string): Promise<TurnCredentialsResult> => {
      const res = await fetchTurnCredentials(callId, bearer);
      if (res.disabled || !res.ice_servers?.length) {
        return { iceServers: [], disabled: true, source: res.source || "disabled", ttl: res.ttl };
      }
      return {
        iceServers: res.ice_servers.map((s) => ({
          urls: s.urls,
          username: s.username,
          credential: s.credential,
        })),
        ttl: res.ttl,
        source: res.source,
        disabled: false,
      };
    };

    const client = new CallClient({
      polite: !asOfferer,
      callId: ownedId,
      fetchTurnCredentials: turnFetcher,
    });
    clientRef.current = client;
    const off = client.onState((next) => {
      if (cancelled || callIdRef.current !== ownedId) return;
      setState(next);
      if (next === "connected") onMediaRef.current?.("connected", ownedId);
      else if (next === "needs_turn" || next === "failed") onMediaRef.current?.("failed", ownedId);
      else if (next === "acquiring_media" || next === "connecting") {
        onMediaRef.current?.("connecting", ownedId);
      }
    });

    void (async () => {
      try {
        const ch = await joinCallChannel(socket, ownedId);
        if (cancelled || callIdRef.current !== ownedId) return;
        ch.on("ended", () => {
          if (cancelled || callIdRef.current !== ownedId) return;
          onEndedRef.current(ownedId);
        });
        client.setRemoteAudioElement(audioRef.current);
        await client.start(ch, asOfferer);
      } catch (e) {
        if (cancelled || callIdRef.current !== ownedId) return;
        const message = e instanceof Error ? e.message : "call_failed";
        setError(message);
        onMediaRef.current?.(message === "microphone_denied" ? "denied" : "failed", ownedId);
      }
    })();

    return () => {
      cancelled = true;
      off();
      if (clientRef.current === client) clientRef.current = null;
      void client.stop();
    };
  }, [mediaReady, call.id, socket, asOfferer, bearer]);

  useEffect(() => {
    clientRef.current?.setRemoteAudioElement(audioRef.current);
    clientRef.current?.setMuted(muted);
  });

  useEffect(() => {
    if (!mediaReady || state === "connected" || state === "failed" || state === "ended") return;
    const ownedId = call.id;
    const timer = window.setTimeout(() => {
      if (callIdRef.current !== ownedId) return;
      onMediaRef.current?.("failed", ownedId);
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [mediaReady, state, call.id]);

  return (
    <div hidden data-testid="active-call-overlay" data-call-id={call.id} data-call-state={state} data-call-error={error || undefined}>
      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}
