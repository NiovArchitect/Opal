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
  // Temporal kicker when headline implies tonight / today — never "Set".
  const kicker = /tonight|today/i.test(headline)
    ? "TONIGHT"
    : /tomorrow/i.test(headline)
      ? "TOMORROW"
      : "TOGETHER";

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

  // Figma 4:2 — settled plate under atmospheric field. No SET badge.
  return (
    <div
      className={`opal-resolution shared-reality-plate phase-${phase}`}
      data-testid="opal-resolution"
      data-phase={phase}
      data-node-ref="4:2"
      role="status"
      aria-label={headline}
    >
      <div className="sr-atmosphere" aria-hidden />
      <div className="sr-plate">
        <p className="sr-kicker">{kicker}</p>
        <p className="sr-title">{headline}</p>
      </div>
    </div>
  );
}
