import React from "react";
import type { CallGraphingState } from "../api/productClient";

/**
 * Repair #19 W12 — the graphing light (scope item 16a).
 *
 * One small light in the ambient indicator language that tells EVERY
 * participant, in real time, whether this call is being grafted into
 * the graph. The state arrives verbatim from the server (REST projection
 * and the call-channel "graphing" broadcast carry the same derivation);
 * this component only gives it words and a tone — it derives nothing.
 *
 * QUIET by law: the light informs, never alarms. No red, no flashing;
 * paused is a hollow ring, graphing a soft filled point, waiting/off a
 * dim point. Every state also carries a plain sentence, because a light
 * nobody can read is decoration, and nothing here is decorative.
 */
export type GraphingLightModel = {
  tone: "on" | "paused" | "waiting" | "off";
  label: string;
  detail: string;
};

export function graphingLightModel(
  state: CallGraphingState,
  peerName: string,
): GraphingLightModel {
  switch (state) {
    case "graphing":
      return {
        tone: "on",
        label: "Graphing on",
        detail:
          "Opal is adding what’s said on this call to your shared graph — plans and follow-ups, never raw audio.",
      };
    case "paused":
      return {
        tone: "paused",
        label: "Graphing paused",
        detail:
          "Paused for this call. Nothing said while it’s paused is transcribed or added to the graph.",
      };
    case "waiting_for_other":
      return {
        tone: "waiting",
        label: "Graphing waiting",
        detail: `Waiting for ${peerName}. Nothing is added to the graph until you both allow it.`,
      };
    case "off":
    default:
      return {
        tone: "off",
        label: "Graphing off",
        detail: "Opal isn’t taking anything from this call.",
      };
  }
}

export function GraphingLight({
  state,
  peerName,
}: {
  state: CallGraphingState;
  peerName: string;
}) {
  const model = graphingLightModel(state, peerName);
  return (
    <div
      className="graphing-light"
      data-testid="graphing-light"
      data-graphing-state={state}
      data-graphing-tone={model.tone}
      role="status"
      aria-label={`${model.label}. ${model.detail}`}
    >
      <span className="graphing-light-dot" aria-hidden />
      <span className="graphing-light-label">{model.label}</span>
    </div>
  );
}

/** The plain capture-truth line shown under the light, per state. */
export function callCaptureTruth(state: CallGraphingState): string {
  switch (state) {
    case "graphing":
      return "Opal Assist is listening on this device to note plans. Raw audio is never saved.";
    case "paused":
      return "Opal is not listening while graphing is paused, and nothing said now is kept.";
    case "waiting_for_other":
    case "off":
    default:
      return "Opal is not listening to, transcribing, or recording this call.";
  }
}
