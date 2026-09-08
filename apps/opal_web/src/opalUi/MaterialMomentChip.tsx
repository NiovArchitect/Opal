/**
 * Opal-novel time surface — one calm material moment, never a clock.
 * Silence is the default; this only mounts when MaterialTime says material.
 */
import React from "react";

export type MaterialMoment = {
  kind: "leave_by" | "availability_overlap" | "shared_now" | "significant_change";
  summary: string;
  urgency?: string;
};

type Props = {
  moment: MaterialMoment;
  onDismiss: () => void;
};

const LABELS: Record<MaterialMoment["kind"], string> = {
  leave_by: "Leave soon",
  availability_overlap: "A time that works",
  shared_now: "You're both free",
  significant_change: "Plan changed",
};

export function MaterialMomentChip({ moment, onDismiss }: Props) {
  return (
    <div
      className="opal-material-moment"
      data-testid="material-moment-chip"
      data-moment-kind={moment.kind}
      role="status"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        top: 56,
        zIndex: 70,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(18,12,36,0.94)",
        border: "1px solid rgba(167,139,250,0.5)",
        color: "#f5f3ff",
        boxShadow: "0 8px 28px rgba(76,29,149,0.35)",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.08em", opacity: 0.7, marginBottom: 4 }}>
        {LABELS[moment.kind].toUpperCase()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{moment.summary}</div>
      <button
        type="button"
        data-testid="material-moment-dismiss"
        onClick={onDismiss}
        style={{
          height: 32,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid rgba(167,139,250,0.4)",
          background: "transparent",
          color: "#e9d5ff",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Got it
      </button>
    </div>
  );
}
