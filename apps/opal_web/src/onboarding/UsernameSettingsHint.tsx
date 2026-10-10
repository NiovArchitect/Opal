/**
 * Paste W6 — username quiet line.
 * Meet onboarding: plain text ("settings").
 * In-app: "settings" links to You > settings (edit-profile / settings hub).
 */
import React from "react";
import { HOLY_SHIT_COPY } from "./holyShitCopy";

type Props = {
  handle: string;
  /** plain = Meet onboarding; link = post-onboarding navigable settings */
  variant?: "plain" | "link";
  onOpenSettings?: () => void;
  className?: string;
  testId?: string;
};

export function UsernameSettingsHint({
  handle,
  variant = "plain",
  onOpenSettings,
  className = "hs-people-hint",
  testId = "hs-self-username-hint",
}: Props) {
  const trimmed = handle.trim();
  if (!trimmed) return null;

  if (variant === "link" && onOpenSettings) {
    return (
      <p className={className} data-testid={testId}>
        You&apos;ll be @{trimmed}. Change anytime in{" "}
        <button
          type="button"
          className="hs-settings-text-link"
          data-testid="hs-username-settings-link"
          onClick={onOpenSettings}
        >
          settings
        </button>
        .
      </p>
    );
  }

  return (
    <p className={className} data-testid={testId}>
      {HOLY_SHIT_COPY.selfUsernameQuiet(trimmed)}
    </p>
  );
}
