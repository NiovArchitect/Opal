/**
 * Center V2 Behavior Convergence — structural contracts.
 * Not R2/R3. Visual shell remains 1094:161; intelligence is real DI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Opal Center V2 behavior convergence", () => {
  const center = read("opalUi/OpalCenterLifeGraph.tsx");

  it("calls resolveDecision with idempotency_key", () => {
    expect(center).toMatch(/resolveDecision/);
    expect(center).toMatch(/idempotency_key/);
    expect(center).toMatch(/idempotencyKey/);
  });

  it("guards stale async results with request generation", () => {
    expect(center).toMatch(/requestGen/);
    expect(center).toMatch(/gen !== requestGen\.current/);
  });

  it("accept is idempotent (double-tap safe)", () => {
    expect(center).toMatch(/acceptLock/);
    expect(center).toMatch(/if \(acceptLock\.current\) return/);
  });

  it("exposes claim provenance (no silent fabrication)", () => {
    expect(center).toMatch(/provenance/);
    expect(center).toMatch(/decision_intelligence/);
    expect(center).toMatch(/opal-center-provenance/);
    expect(center).toMatch(/No fabricated distance or traffic|not invent/);
  });

  it("does not reintroduce rejected 1086 neural dashboard", () => {
    expect(center).not.toMatch(/neural-field/);
    expect(center).toMatch(/1094:161/);
  });

  it("OpalApp Solo Center still mounts Life Graph (dock 1114 supersedes embedded 92pt)", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/OpalCenterLifeGraph/);
    expect(app).toMatch(/data-figma-dock="1114:2"/);
  });
});
