import React from "react";
import type { CallGraphingState } from "../api/productClient";

/**
 * Repair #19 polish, Cluster F (P10b) - the ORBIT TRACE.
 *
 * A light that travels the border of a surface continuously, for
 * SUSTAINED live states only. It is a reusable, token-driven
 * treatment: the caller hands it a live-state input and renders it
 * inside the surface it traces; it derives nothing and invents no
 * state. The trace exists ONLY while its state is true - when the
 * input goes null the component renders nothing, so the light exits
 * the moment the state ends.
 *
 * Grammar (draft rulebook entry AR-F7, filed by the integrator):
 * - "live" - the surface is in live presence (a connected call):
 *   the segment carries the canon happening cyan
 *   (--orb-indicator-happening), one circuit in 12s.
 * - "graphing" - graphing is actively ingesting on this call: the
 *   segment carries the opal fire gradient (--orb-fire-gradient),
 *   one circuit in 9s. Graphing is the stronger sustained state,
 *   so when both inputs are true the trace carries graphing - one
 *   orbiting surface, one trace, one meaning at a time.
 *
 * QUIET by law (AR-00.2): a 2px ring at ambient strength, opacity
 * only, no layout motion, no sound, and the travel pauses while
 * the document is hidden. REDUCED MOTION: the travel stops and a
 * steady ruled border in the same state color remains - the same
 * meaning, carried statically (pattern channel: solid ring for
 * live, fire-gradient ring for graphing; the state is also always
 * named in words beside it - the graphing light / the call status -
 * so color is never the only channel).
 */
export type OrbitTraceState = "live" | "graphing";

/**
 * The one mapping from live inputs to the trace state. Connected
 * is the floor; active graphing takes the trace over. Paused and
 * off graphing do NOT take it - a paused call is live presence,
 * not graphing, and the trace must not claim otherwise.
 */
export function orbitTraceStateFor(input: {
  connected: boolean;
  graphing?: CallGraphingState | null;
}): OrbitTraceState | null {
  if (!input.connected) return null;
  if (input.graphing === "graphing") return "graphing";
  return "live";
}

export function OrbitTrace({ state }: { state: OrbitTraceState | null }) {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    if (!state) return;
    const onVisibility = () => setHidden(document.hidden);
    setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [state]);

  if (!state) return null;
  return (
    <div
      className="orbit-trace"
      data-testid="orbit-trace"
      data-orbit-trace-state={state}
      data-orbit-trace-paused={hidden ? "true" : undefined}
      aria-hidden
    >
      <span className="orbit-trace-runner" />
    </div>
  );
}
