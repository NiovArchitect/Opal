/**
 * ACTIVITY — CURRENT destination 618:2384
 * Meaningful changes affecting relationship / Graph / commitment / provider / decision.
 * Not generic notifications. Not dopamine spam.
 * P3: rows carry Signal Grammar semantic state (COLOR + plain language).
 * Activity icon FOUNDER_REVIEW source remains not implemented here.
 */
import React from "react";
import type { SignalSemanticState } from "../theme/signalGrammar";

type Props = {
  onBack: () => void;
  onOpenGraph?: () => void;
};

type ActivityRow = {
  id: string;
  /** needs_attention | changed | confirmed | provisional | settled */
  signalState: SignalSemanticState;
  title: string;
  detail: string;
  actionable: boolean;
};

const ROWS: ActivityRow[] = [
  {
    id: "needs-reconfirm",
    signalState: "needs_attention",
    actionable: true,
    title: "Juniper & Ivy — change to confirm",
    detail: "Time changed · reconfirm if you are still in",
  },
  {
    id: "joined",
    signalState: "changed",
    actionable: false,
    title: "Chanelle joined the Graph",
    detail: "Tonight · shared Reality updated",
  },
  {
    id: "reservation",
    signalState: "needs_attention",
    actionable: true,
    title: "Reservation held",
    detail: "Provider slot waiting · confirm before it expires",
  },
  {
    id: "memory-ready",
    signalState: "provisional",
    actionable: false,
    title: "Memory ready",
    detail: "Private candidate · publish when you want",
  },
];

export function ActivityDestination({ onBack, onOpenGraph }: Props) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <div
      className="activity-dest-473-141"
      data-testid="activity-destination"
      data-figma-node="618:2384"
      data-screen="activity-00"
      data-founder-title="Activity"
      data-signal-grammar="965:2"
      role="dialog"
      aria-modal="true"
      aria-label="Activity"
    >
      <header className="social-dest-brand" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="activity-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
      </header>
      <h1 className="activity-dest-title">Activity</h1>
      <p className="activity-dest-lede">
        Only changes that affect a relationship, Graph, commitment, provider state or decision.
      </p>
      {ROWS.map((r) => (
        <button
          key={r.id}
          type="button"
          className="activity-row"
          data-testid={`activity-row-${r.id}`}
          data-needs-you={r.signalState === "needs_attention" ? "true" : "false"}
          data-signal-state={r.signalState}
          onClick={() => {
            if (r.actionable) onOpenGraph?.();
            else onBack();
          }}
        >
          <strong>{r.title}</strong>
          <span>{r.detail}</span>
        </button>
      ))}
    </div>
  );
}
