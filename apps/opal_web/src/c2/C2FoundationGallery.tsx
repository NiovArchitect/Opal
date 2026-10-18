/**
 * Repair #18 - Division C2 - foundation gallery (evidence surface).
 *
 * Dev review route (?review=c2), following the AvailabilityReview
 * precedent in App.tsx. Renders the foundation the surface phases
 * consume - both splashes, the reference plan card in all five states,
 * the identity lockups, and every Loop expression - with a live mode
 * toggle that flips data-mode in the same frame (no reload). This is
 * the surface the per-mode visual evidence and the night-path
 * brightness pass are captured from, through the real served path.
 */
import React, { useState } from "react";
import { C2Splash1 } from "../onboarding/C2Splash1";
import { C2Splash2 } from "../onboarding/C2Splash2";
import { PlanCardC2 } from "./PlanCardC2";
import { LoopCharacter } from "./LoopCharacter";
import { C2LockupInline, C2Wordmark } from "./C2Wordmark";
import { setC2ModePreference, type C2ModePreference } from "../theme/c2Mode";
import type { LoopExpression } from "../brand/c2Identity";

const STATE_CARDS = [
  { stateFamily: "forming", stateLabel: "Forming", title: "Dinner at Juniper and Ivy", whenLine: "Time not set yet.", whereLine: "Juniper and Ivy, North Park", attendanceLine: "2 of 4 going", primaryActionLabel: "Pick a time" },
  { stateFamily: "action", stateLabel: "Action needed", title: "Dinner at Juniper and Ivy", whenLine: "Thu, Oct 22 at 7:30 PM", whereLine: "Juniper and Ivy, North Park", attendanceLine: "3 of 4 going", primaryActionLabel: "Review and respond" },
  { stateFamily: "ready", stateLabel: "Ready", title: "Rooftop Jazz", whenLine: "Fri, Oct 23 at 8:00 PM", whereLine: "Zilker Park Rooftop", attendanceLine: "4 of 4 going", primaryActionLabel: "View plan" },
  { stateFamily: "happening", stateLabel: "Happening", title: "Rooftop Jazz", whenLine: "Tonight at 8 PM", whereLine: "Zilker Park Rooftop", attendanceLine: "12 going", primaryActionLabel: "View plan" },
  { stateFamily: "past", stateLabel: "Past", title: "Morning hike", whenLine: "Sat, Oct 10 at 9:00 AM", whereLine: "Torrey Pines", attendanceLine: "3 of 3 going", primaryActionLabel: "View plan" },
] as const;

const EXPRESSIONS: LoopExpression[] = ["rest", "glad", "thinking", "listening", "sleep"];

export function C2FoundationGallery() {
  const [view, setView] = useState<"splash1" | "splash2" | "system">("system");
  const [pref, setPref] = useState<C2ModePreference>("system");
  const choose = (p: C2ModePreference) => {
    setPref(p);
    setC2ModePreference(p);
  };
  return (
    <div
      data-testid="c2-foundation-gallery"
      style={{ background: "var(--canvas)", color: "var(--ink-1)", minHeight: "100dvh" }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          padding: 12,
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--line-1)",
        }}
      >
        <strong style={{ font: "var(--type-callout)", fontWeight: 700 }}>C2 foundation</strong>
        {(["system", "light", "dark"] as const).map((p) => (
          <button
            key={p}
            type="button"
            data-testid={`c2-mode-${p}`}
            data-active={pref === p ? "1" : "0"}
            onClick={() => choose(p)}
            style={{
              minHeight: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid var(--line-2)",
              background: pref === p ? "var(--accent-quiet)" : "var(--surface-2)",
              color: "var(--ink-1)",
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
        {(["system", "splash1", "splash2"] as const).map((v) => (
          <button
            key={v}
            type="button"
            data-testid={`c2-view-${v}`}
            onClick={() => setView(v)}
            style={{
              minHeight: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid var(--line-2)",
              background: view === v ? "var(--accent-quiet)" : "var(--surface-2)",
              color: "var(--ink-1)",
              cursor: "pointer",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "splash1" ? (
        <C2Splash1 onContinue={() => setView("splash2")} onAlreadyAccount={() => setView("system")} />
      ) : view === "splash2" ? (
        <C2Splash2 onEnter={() => setView("system")} onAlreadyAccount={() => setView("system")} />
      ) : (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: 20, display: "grid", gap: 28 }}>
          <section data-testid="c2-gallery-identity">
            <h2 style={{ font: "var(--type-title)" }}>Identity</h2>
            <div style={{ display: "grid", gap: 16 }}>
              <C2LockupInline wordmarkWidth={96} />
              <C2Wordmark width={132} />
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                {EXPRESSIONS.map((e) => (
                  <figure key={e} style={{ margin: 0, textAlign: "center" }}>
                    <LoopCharacter expression={e} size={72} title="" />
                    <figcaption style={{ font: "var(--type-caption)", color: "var(--ink-2)" }}>{e}</figcaption>
                  </figure>
                ))}
                <figure style={{ margin: 0, textAlign: "center" }}>
                  <LoopCharacter expression="rest" size={28} title="" />
                  <figcaption style={{ font: "var(--type-caption)", color: "var(--ink-2)" }}>mark 28px</figcaption>
                </figure>
              </div>
            </div>
          </section>
          <section data-testid="c2-gallery-states" style={{ display: "grid", gap: 12 }}>
            <h2 style={{ font: "var(--type-title)" }}>Plan states</h2>
            {STATE_CARDS.map((c) => (
              <PlanCardC2 key={c.stateFamily} input={{ ...c }} />
            ))}
          </section>
        </main>
      )}
    </div>
  );
}
