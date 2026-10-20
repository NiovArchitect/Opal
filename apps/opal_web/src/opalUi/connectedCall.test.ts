import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { orbitTraceStateFor } from "./orbitTrace";
import { participantStateModel } from "./participantStates";

/**
 * Repair #19 polish, Cluster F (P10a + P10b): the connected call
 * surface as a first-class ambient surface - orbit trace keyed to
 * sustained live states, truthful participant states, and the
 * plan-in-context from the ONE live-call projection. F-16 stands:
 * no transcript, no captions, nothing simulated anywhere here.
 */
describe("orbit trace state (P10b)", () => {
  it("exists only while a sustained live state is true", () => {
    expect(orbitTraceStateFor({ connected: false, graphing: "graphing" })).toBeNull();
    expect(orbitTraceStateFor({ connected: false, graphing: null })).toBeNull();
    expect(orbitTraceStateFor({ connected: true, graphing: null })).toBe("live");
    expect(orbitTraceStateFor({ connected: true, graphing: "off" })).toBe("live");
  });

  it("graphing takes the trace over; paused never claims graphing", () => {
    expect(orbitTraceStateFor({ connected: true, graphing: "graphing" })).toBe("graphing");
    expect(orbitTraceStateFor({ connected: true, graphing: "paused" })).toBe("live");
    expect(orbitTraceStateFor({ connected: true, graphing: "waiting_for_other" })).toBe("live");
  });

  it("renders nothing when its state ends, and one trace only on the call surface", () => {
    const trace = readFileSync(resolve(__dirname, "orbitTrace.tsx"), "utf8");
    const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
    expect(trace).toMatch(/if \(!state\) return null/);
    expect(trace).toMatch(/data-orbit-trace-state=\{state\}/);
    expect(surface.match(/<OrbitTrace state=\{traceState\} \/>/g)?.length).toBe(1);
    // The trace pauses while the document is hidden - it never runs unseen.
    expect(trace).toMatch(/visibilitychange/);
    expect(trace).toMatch(/data-orbit-trace-paused/);
  });

  it("is token-driven and QUIET: canon happening for live, opal fire for graphing", () => {
    const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
    expect(css).toMatch(/\.orbit-trace-runner \{[^}]*--orb-indicator-happening/);
    expect(css).toMatch(/\[data-orbit-trace-state="graphing"\] \.orbit-trace-runner/);
    expect(css).toMatch(/--orb-fire-violet/);
    expect(css).toMatch(/orbit-trace-travel-live 12s linear infinite/);
    expect(css).toMatch(/animation-duration: 9s/);
  });

  it("keeps its meaning under reduced motion: a steady ruled border, same colors", () => {
    const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
    const reduced = css.slice(css.indexOf("Reduced-motion parity (AR-00.6): the travel stops"));
    expect(reduced).toMatch(/prefers-reduced-motion: reduce/);
    expect(reduced).toMatch(/\.orbit-trace-runner \{\s*animation: none/);
    expect(reduced).toMatch(/--orb-indicator-happening\) 48%/);
    expect(reduced).toMatch(/border-image: var\(--orb-fire-gradient\) 1/);
  });
});

describe("participant states (P10a)", () => {
  it("models only truthful self states: muted wins, then speaking, then on call", () => {
    expect(participantStateModel({ muted: true, selfSpeaking: true }).selfLabel).toBe("Muted");
    expect(participantStateModel({ muted: false, selfSpeaking: true }).selfLabel).toBe("Speaking");
    expect(participantStateModel({ muted: false, selfSpeaking: false }).selfLabel).toBe("On call");
    // The peer label never claims a mute or speaking state.
    expect(participantStateModel({ muted: true, selfSpeaking: true }).peerLabel).toBe("On call");
  });

  it("derives speaking from the real mic tap, never from a timer or a fixture", () => {
    const src = readFileSync(resolve(__dirname, "participantStates.tsx"), "utf8");
    expect(src).toMatch(/tapCallMicrophone\(callId\)/);
    expect(src).toMatch(/createAnalyser/);
    expect(src).toMatch(/getByteTimeDomainData/);
    expect(src).toMatch(/SPEAKING_RMS_THRESHOLD/);
  });

  it("renders participants only on the connected phase", () => {
    const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
    expect(surface).toMatch(/view\.phase === "connected" \? \(\s*<ParticipantStates/);
    expect(surface).toMatch(/data-testid="call-participants"|ParticipantStates peerName/);
  });
});

describe("connected surface wiring (P10a)", () => {
  it("lifts the ONE graphing state from the assist control into the trace", () => {
    const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
    const assist = readFileSync(resolve(__dirname, "callAssist.tsx"), "utf8");
    expect(surface).toMatch(/onGraphingChange=\{setGraphingState\}/);
    expect(surface).toMatch(/orbitTraceStateFor\(\{\s*connected: view\.phase === "connected",\s*graphing: graphingState/);
    expect(assist).toMatch(/onGraphingChangeRef\.current\?\.\(next\.graphing\)/);
    // The surface never computes graphing from consent fields either.
    expect(surface).not.toMatch(/self_allowed|selfAllowed/);
  });

  it("shows the plan-in-context verbatim from the live call projection", () => {
    const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
    const client = readFileSync(resolve(__dirname, "../api/productClient.ts"), "utf8");
    const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");
    expect(surface).toMatch(/data-testid="call-plan-context"/);
    expect(surface).toMatch(/\{plan\.title\}/);
    expect(surface).toMatch(/\{plan\.when_label\}/);
    expect(surface).toMatch(/\{plan\.where_label\}/);
    expect(surface).toMatch(/data-plan-state=\{planStateAttr\(plan\.state\)\}/);
    expect(client).toMatch(/next_plan\?: NextPlanFact \| null/);
    expect(app).toMatch(/liveNextPlan: res\.call\.next_plan \?\? null/);
    expect(app).toMatch(/plan=\{callSurface\.liveNextPlan \?\? null\}/);
  });

  it("keeps video honest: no feed is painted and the surface says audio only", () => {
    const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
    expect(surface).toMatch(/data-testid="call-video-truth"/);
    expect(surface).toMatch(/Opal calls are audio only/);
    expect(surface).toMatch(/kind === "video"/);
  });

  it("never shows a fake or live transcript or captions (F-16 stands)", () => {
    for (const file of ["CallSurfaces.tsx", "orbitTrace.tsx", "participantStates.tsx"]) {
      const src = readFileSync(resolve(__dirname, file), "utf8");
      expect(src).not.toMatch(/caption/i);
      expect(src.toLowerCase()).not.toMatch(/live transcript|transcript segment|heard:/);
    }
  });
});
