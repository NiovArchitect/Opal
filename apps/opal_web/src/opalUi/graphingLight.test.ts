import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { callCaptureTruth, graphingLightModel } from "./graphingLight";

/**
 * Repair #19 W12 (items 15+16): the graphing light renders the ONE
 * server-derived graphing state verbatim; the pause control is wired to
 * the real consent gate; unwired capture stays honestly absent.
 */
describe("graphing light (Repair #19 W12)", () => {
  it("gives every graphing state a distinct tone, label, and plain sentence", () => {
    const on = graphingLightModel("graphing", "Maya");
    const paused = graphingLightModel("paused", "Maya");
    const waiting = graphingLightModel("waiting_for_other", "Maya");
    const off = graphingLightModel("off", "Maya");

    expect(on.tone).toBe("on");
    expect(on.label).toBe("Graphing on");
    expect(paused.tone).toBe("paused");
    expect(paused.label).toBe("Graphing paused");
    expect(paused.detail).toMatch(/Nothing said while it’s paused is transcribed/);
    expect(waiting.tone).toBe("waiting");
    expect(waiting.detail).toContain("Maya");
    expect(off.tone).toBe("off");
    expect(off.label).toBe("Graphing off");

    const tones = new Set([on.tone, paused.tone, waiting.tone, off.tone]);
    expect(tones.size).toBe(4);
  });

  it("states the capture truth plainly per state — never a simulated transcript", () => {
    expect(callCaptureTruth("graphing")).toMatch(/listening on this device/);
    expect(callCaptureTruth("graphing")).toMatch(/Raw audio is never saved/);
    expect(callCaptureTruth("paused")).toMatch(/not listening while graphing is paused/);
    expect(callCaptureTruth("off")).toMatch(/not listening to, transcribing, or recording/);
    expect(callCaptureTruth("waiting_for_other")).toMatch(/not listening/);
  });

  it("renders the server state verbatim and derives nothing on the client", () => {
    const light = readFileSync(resolve(__dirname, "graphingLight.tsx"), "utf8");
    const assist = readFileSync(resolve(__dirname, "callAssist.tsx"), "utf8");
    expect(light).toMatch(/data-graphing-state=\{state\}/);
    expect(light).toMatch(/data-testid="graphing-light"/);
    // The client never computes graphing from consent fields.
    expect(assist).not.toMatch(/self_allowed &&|peer.*allowed.*\?.*graphing/);
    expect(assist).toMatch(/setGraphing\(next\.graphing\)/);
  });

  it("wires the pause/resume control to the real assist consent write", () => {
    const assist = readFileSync(resolve(__dirname, "callAssist.tsx"), "utf8");
    expect(assist).toMatch(/data-testid="call-assist-toggle"/);
    expect(assist).toMatch(/graphing === "graphing"\) void choose\(false, "call"\)/);
    expect(assist).toMatch(/selfPaused\) void choose\(true, "call"\)/);
    expect(assist).toMatch(/data-graphing-action=/);
    // A peer's pause is held by the peer — the surface says so instead
    // of pretending a tap could resume someone else's consent.
    expect(assist).toMatch(/Paused by \$\{peerName\}/);
    expect(assist).toMatch(/data-testid="call-graphing-held-note"/);
    expect(assist).toMatch(/Only they can resume their side/);
  });

  it("refreshes the light from the call-channel graphing broadcast, with the poll as backstop", () => {
    const assist = readFileSync(resolve(__dirname, "callAssist.tsx"), "utf8");
    const overlay = readFileSync(resolve(__dirname, "ActiveCallOverlay.tsx"), "utf8");
    expect(overlay).toMatch(/ch\.on\("graphing"/);
    expect(overlay).toMatch(/opal:call-graphing/);
    expect(assist).toMatch(/addEventListener\("opal:call-graphing"/);
    expect(assist).toMatch(/detail\?\.call_id === callId/);
  });

  it("presents the call as an Opal orbit stage, not a generic phone screen (identity bar)", () => {
    const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
    const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
    // The peer stays at the orbit's center for the whole call; the
    // timer is a separate quiet line and never replaces the person.
    expect(surface).toMatch(/data-testid="call-orbit"/);
    expect(surface).toMatch(/data-orbit-phase=\{view\.phase\}/);
    expect(surface).toMatch(/<OrbMark size=\{26\}/);
    expect(surface).not.toMatch(/view\.showTimer \? \(\s*<p className="live-call-timer"[\s\S]{0,200}\) : \(\s*<div className="live-call-mark"/);
    expect(css).toMatch(/\.live-call-orbit-ring--tilt/);
    expect(css).toMatch(/live-call-orbit-turn/);
    // Motion only while waiting; connected is still.
    expect(css).toMatch(/\[data-orbit-phase="connecting"\] \.live-call-orbit-ring--tilt/);
    expect(css).not.toMatch(/\[data-orbit-phase="connected"\] \.live-call-orbit-ring--tilt \{\s*animation/);
    // Frosted glass assist pane over Opal's spectral field.
    expect(css).toMatch(/\.live-call-assist \{[^}]*backdrop-filter: blur\(14px\)/);
    expect(css).toMatch(/radial-gradient\(120% 55% at 18% -4%, rgba\(125, 77, 206/);
  });

  it("keeps the honest-absent capture note before connection (F-16 stands)", () => {
    const surface = readFileSync(resolve(__dirname, "CallSurfaces.tsx"), "utf8");
    expect(surface).toMatch(/data-testid="call-capture-note"/);
    expect(surface).toMatch(/Opal doesn’t record calls/);
    expect(surface).toMatch(/only if you both allow it/);
    // The assist control (and therefore any transcription) exists only
    // on a connected phase — never painted onto ringing/fixture stages.
    expect(surface).toMatch(/view\.phase === "connected" && assistCallId/);
  });
});
