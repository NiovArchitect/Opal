/**
 * Local visual review surface for founder / dual-AI inspection.
 * Route: hash #/review/availability or query ?review=availability
 */
import React, { useState } from "react";
import { semanticStateForSignal } from "../theme/technicolorProduction";
import { visualShellProps } from "../theme/technicolorProduction";

const SCENES = [
  {
    id: "1to1",
    title: "1:1 friends",
    signal: "open_loop",
    signalLabel: "Still open",
    overlapLabel: "One time works for both of you.",
    detail: "Thursday, 6:30–9:00 PM",
  },
  {
    id: "group",
    title: "Small friend group",
    signal: "plan_forming",
    signalLabel: "Becoming a plan",
    overlapLabel: "2 times work for both of you.",
    detail: "See all 2 times",
  },
  {
    id: "set",
    title: "Authoritative Set (not availability)",
    signal: "set",
    signalLabel: "Set",
    overlapLabel: null,
    detail: null,
  },
] as const;

export function AvailabilityReview() {
  const [sceneId, setSceneId] = useState<(typeof SCENES)[number]["id"]>("1to1");
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const shell = visualShellProps("member");

  return (
    <div
      data-testid="availability-review"
      {...shell}
      className={`app app-futura ${shell.className ?? ""}`.trim()}
      style={{ minHeight: "100vh", padding: 16, maxWidth: 420, margin: "0 auto" }}
    >
      <h1 style={{ fontSize: "1.1rem", marginBottom: 8 }}>Availability review</h1>
      <p className="muted-lede" style={{ marginBottom: 16 }}>
        Controlled Technicolor · no calendar chrome · emerald only on Set
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="btn ghost"
            onClick={() => setSceneId(s.id)}
            aria-pressed={sceneId === s.id}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div
        className={`opal-moment journey signal-${scene.signal}`}
        role="status"
        data-state={semanticStateForSignal(scene.signal)}
      >
        <span className="opal-moment-mark" aria-hidden>
          ◈
        </span>
        <span className="opal-moment-label">{scene.signalLabel}</span>
      </div>

      {scene.overlapLabel ? (
        <div
          className={`opal-moment inline moment-enter signal-availability_overlap${
            scene.detail ? " has-detail" : ""
          }`}
          role="status"
          data-state={semanticStateForSignal("availability_overlap")}
          style={{ marginTop: 16 }}
        >
          <span className="opal-moment-mark" aria-hidden>
            ◈
          </span>
          <span className="opal-moment-label">{scene.overlapLabel}</span>
          {scene.detail ? (
            <span className="opal-moment-detail">{scene.detail}</span>
          ) : null}
        </div>
      ) : null}

      <ul className="muted-lede" style={{ marginTop: 24, lineHeight: 1.5 }}>
        <li>Find a time opens from journey chip only while forming / still open.</li>
        <li>Overlap moment uses recognition spectrum — not completion emerald.</li>
        <li>Set uses completion emerald only when authoritative.</li>
        <li>Reduced motion: set prefers-reduced-motion; entrance becomes instant.</li>
      </ul>
    </div>
  );
}
