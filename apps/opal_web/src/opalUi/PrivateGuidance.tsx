/**
 * Private Opal Guidance — owner-only strip above the composer.
 * Dominant deepViolet for border + label. Never in shared thread payload.
 */
import React from "react";

type Props = {
  text: string;
  onDismiss: () => void;
  onAction?: () => void;
  actionLabel?: string;
};

export function PrivateGuidance({ text, onDismiss, onAction, actionLabel }: Props) {
  return (
    <div
      className="opal-private-guidance"
      data-testid="opal-private-guidance"
      data-private="true"
      role="status"
      aria-label={`Private: ${text}`}
    >
      <div className="opal-private-guidance-inner">
        <span className="opal-private-mark" aria-hidden>
          ◈
        </span>
        <span className="opal-private-label">{text}</span>
        <div className="opal-private-actions">
          {onAction && actionLabel ? (
            <button type="button" className="btn ghost" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="btn ghost"
            onClick={onDismiss}
            aria-label="Dismiss private note"
          >
            Dismiss
          </button>
        </div>
      </div>
      <p className="opal-private-hint">Only you can see this</p>
    </div>
  );
}
