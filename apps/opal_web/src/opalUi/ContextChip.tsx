/**
 * Context Chip — one useful forward-looking action near the composer.
 * Not a permanent AI button; appears only while useful.
 */
import React from "react";

type Props = {
  label: string;
  onClick: () => void;
};

export function ContextChip({ label, onClick }: Props) {
  return (
    <button
      type="button"
      className="opal-context-chip"
      data-testid="opal-context-chip"
      onClick={onClick}
      aria-label={label}
    >
      <span className="opal-moment-mark" aria-hidden>
        ◈
      </span>
      <span>{label}</span>
    </button>
  );
}
