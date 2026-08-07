import React, { useState } from "react";
import { FirstRunExperience } from "./FirstRunExperience";

/**
 * Focused comparison route: ?visual-review=1
 * A = rejected halo (demo only)
 * B = corrected first screen
 * C = corrected Join screen
 */
export function WalkthroughVisualReview() {
  const [panel, setPanel] = useState<"A" | "B" | "C">("B");

  const forceStep = panel === "C" ? 4 : 0;
  const variant = panel === "A" ? "before-rejected" : "after";

  return (
    <div
      className="visual-review-shell"
      data-testid="walkthrough-visual-review"
      style={{
        minHeight: "100dvh",
        background: "#05060A",
        color: "#f2f6fa",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <strong style={{ marginRight: 8 }}>Walkthrough visual review</strong>
        {(
          [
            ["A", "A · Rejected halo"],
            ["B", "B · No halo · first"],
            ["C", "C · No halo · Join"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="btn ghost"
            data-testid={`visual-review-${id}`}
            aria-pressed={panel === id}
            onClick={() => setPanel(id)}
            style={{
              borderColor: panel === id ? "rgba(62,224,240,0.6)" : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </header>
      <div
        style={{
          flex: 1,
          maxWidth: 390,
          width: "100%",
          margin: "0 auto",
          minHeight: 844,
          position: "relative",
          outline: "1px dashed rgba(255,255,255,0.08)",
        }}
        data-viewport="390x844"
      >
        <FirstRunExperience
          open
          forceStepIndex={forceStep}
          reviewVariant={variant}
          onComplete={() => {
            /* review only */
          }}
        />
      </div>
    </div>
  );
}
