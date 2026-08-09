/**
 * OPAL RESOLUTION — Set material (internal name only).
 * Coherence, not celebration. Emerald only here. Motion ceases.
 */
import React, { useEffect, useState } from "react";

type Props = {
  /** Optional confirmed shared detail — never fabricated */
  detail?: string | null;
  /** After hold, call when receding to calm (optional) */
  onSettled?: () => void;
};

export function OpalResolution({ detail, onSettled }: Props) {
  const [phase, setPhase] = useState<"enter" | "hold" | "calm">("enter");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("hold"), 520);
    const t2 = window.setTimeout(() => {
      setPhase("calm");
      onSettled?.();
    }, 2200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onSettled]);

  return (
    <div
      className={`opal-resolution phase-${phase}`}
      data-testid="opal-resolution"
      data-phase={phase}
      role="status"
      aria-label={detail ? `Set. ${detail}` : "Set"}
    >
      <div className="opal-resolution-ambient" aria-hidden />
      <div className="opal-resolution-core">
        <span className="opal-resolution-mark" aria-hidden>
          ◈
        </span>
        <span className="opal-resolution-label">Set</span>
        {detail ? (
          <span className="opal-resolution-detail">{detail}</span>
        ) : null}
      </div>
    </div>
  );
}
