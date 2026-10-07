/**
 * Phase 3 degraded path — full-screen in-app incoming call UI when CallKit
 * is unavailable (Expo Go / missing native module / simulator).
 */
import React from "react";
import type { IncomingCallPayload } from "../realtime/incomingCallHandler";

type Props = {
  payload: IncomingCallPayload;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallFallback({ payload, onAccept, onDecline }: Props) {
  const initial = (payload.caller_name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <div
      className="opal-incoming-call-fallback"
      data-testid="incoming-call-fallback"
      role="dialog"
      aria-label={`Incoming call from ${payload.caller_name}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background: "radial-gradient(circle at 50% 20%, #2a1f4d, #050816 70%)",
        color: "#f5f0ff",
        padding: 32,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: payload.caller_avatar_url
            ? `center/cover url(${payload.caller_avatar_url})`
            : "linear-gradient(135deg,#a78bfa,#6366f1)",
          display: "grid",
          placeItems: "center",
          fontSize: 40,
          fontWeight: 600,
        }}
      >
        {!payload.caller_avatar_url ? initial : null}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 6 }}>
          {payload.call_type === "video" ? "Video call" : "Opal call"}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>{payload.caller_name}</div>
      </div>
      <div style={{ display: "flex", gap: 28, marginTop: 40 }}>
        <button
          type="button"
          data-testid="incoming-call-decline"
          onClick={onDecline}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "none",
            background: "#ef4444",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Decline
        </button>
        <button
          type="button"
          data-testid="incoming-call-accept"
          onClick={onAccept}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "none",
            background: "#22c55e",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
