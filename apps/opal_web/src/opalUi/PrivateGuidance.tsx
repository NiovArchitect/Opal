/**
 * Private Opal moment — owner-only, inward violet (Screen 3 material world).
 * Not a helper/instruction card. One thought + privacy line.
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
      aria-label={`Private: ${text}. Only you can see this.`}
    >
      <button
        type="button"
        className="opal-private-close-x"
        onClick={onDismiss}
        aria-label="Dismiss private note"
      >
        ×
      </button>
      <div className="opal-private-guidance-kicker">
        <span className="opal-private-mark" aria-hidden>
          ◆
        </span>
        <span className="opal-private-hint">Only you can see this</span>
      </div>
      <p className="opal-private-label">{text}</p>
      {onAction && actionLabel ? (
        <button
          type="button"
          className="opal-private-soft-action"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
