/**
 * SHARED REALITY SIGNATURE OBJECT — Figma 4:2
 *
 * One fact → one best local presentation. Travel only when trusted.
 */
import React, { useEffect, useState } from "react";
import { composeHumanReality } from "./composeHumanReality";
import { SharedRealityPlate } from "./v2Primitives";

export type SharedRealityDetail = {
  headline?: string | null;
  what?: string | null;
  who?: string | null;
  when?: string | null;
  where?: string | null;
  area?: string | null;
  distance?: string | null;
  leaveAround?: string | null;
  kicker?: string | null;
  gap?: string | null;
};

type Props = {
  detail?: string | null;
  reality?: SharedRealityDetail | null;
  onSettled?: () => void;
};

export function OpalResolution({ detail, reality, onSettled }: Props) {
  const [phase, setPhase] = useState<"enter" | "hold" | "calm">("enter");

  const composed = composeHumanReality({
    what: reality?.what || reality?.headline || detail || null,
    who: reality?.who || null,
    when: reality?.when || null,
    where: reality?.where || null,
    area: reality?.area || null,
    distance: reality?.distance || null,
    leaveAround: reality?.leaveAround || null,
    kicker: reality?.kicker || null,
    gap: reality?.gap || null,
  });

  let headline = composed.headline;
  if (/^(set|still open|this could work)$/i.test(headline)) {
    headline = "You're both in";
  }

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
  }, [onSettled, headline]);

  return (
    <SharedRealityPlate
      headline={headline}
      kicker={composed.kicker}
      whenWhere={composed.primary}
      area={null}
      distance={null}
      leaveAround={null}
      // Secondary holds area/distance/leave without restating time
      secondary={composed.secondary}
      phase={phase}
    />
  );
}
