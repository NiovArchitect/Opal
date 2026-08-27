/**
 * ACTIVITY — meaningful social/product changes.
 * Dated destination 618:2384 with FOUNDER OVERRIDE (2026-08-26):
 * Customer-facing title is "Activity" — NOT "Needs you".
 * Not dopamine spam — social consequence that matters.
 */
import React from "react";

type Props = {
  onBack: () => void;
  onOpenGraph?: () => void;
};

const ROWS = [
  {
    id: "needs-reconfirm",
    actionable: true,
    title: "Juniper & Ivy — change to confirm",
    detail: "Time changed · reconfirm if you are still in",
  },
  {
    id: "joined",
    actionable: false,
    title: "Chanelle joined the Graph",
    detail: "Tonight · shared Reality updated",
  },
  {
    id: "reservation",
    actionable: true,
    title: "Reservation held",
    detail: "Provider slot waiting · confirm before it expires",
  },
  {
    id: "memory-ready",
    actionable: false,
    title: "Memory ready",
    detail: "Private candidate prepared · publish when you want",
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
        Meaningful social changes — not noise. Your social world moved.
      </p>
      {ROWS.map((r) => (
        <button
          key={r.id}
          type="button"
          className="activity-row"
          data-testid={`activity-row-${r.id}`}
          data-needs-you={r.actionable ? "true" : "false"}
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
