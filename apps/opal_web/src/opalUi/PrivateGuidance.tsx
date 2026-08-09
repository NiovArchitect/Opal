/**
 * Private Opal Guidance — owner-only strip above the composer.
 * Dominant deepViolet for border + label. Never in shared thread payload.
 * quiet: compound-state demotion when Expanded Moment already owns the room.
 */
import React from "react";

type Props = {
  text: string;
  onDismiss: () => void;
  onAction?: () => void;
  actionLabel?: string;
  quiet?: boolean;
};

export function PrivateGuidance({
  text,
  onDismiss,
  onAction,
  actionLabel,
  quiet,
}: Props) {
  return (
    <div
      className={`opal-private-guidance${quiet ? " is-quiet" : ""}`}
      data-testid="opal-private-guidance"
      data-private="true"
      data-quiet={quiet ? "true" : "false"}
      role="status"
      aria-label={`Private: ${text}`}
    >
      <div className="opal-private-guidance-inner">
        <span className="opal-private-mark" aria-hidden>
          ◆
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
