/**
 * OPAL RESOLUTION — alignment materializes as Shared Reality (internal: Set).
 * Coherence, not celebration. Emerald only here. Motion ceases.
 * User-facing copy is the human plan (what/when/where), never the word "Set".
 */
import React, { useEffect, useState } from "react";

type Props = {
  /** Human shared-reality headline — never fabricated, never "Set" taxonomy */
  detail?: string | null;
  /** After hold, call when receding to calm (optional) */
  onSettled?: () => void;
};

export function OpalResolution({ detail, onSettled }: Props) {
  const [phase, setPhase] = useState<"enter" | "hold" | "calm">("enter");
  const headline = (detail && detail.trim()) || "You're both in";

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
      aria-label={headline}
    >
      <div className="opal-resolution-ambient" aria-hidden />
      <div className="opal-resolution-core">
        <span className="opal-resolution-mark" aria-hidden>
          ◈
        </span>
        <span className="opal-resolution-label">{headline}</span>
      </div>
    </div>
  );
}
