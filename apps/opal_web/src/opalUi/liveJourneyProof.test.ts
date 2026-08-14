import { describe, expect, it } from "vitest";
import { runFounderJordanJourney } from "./liveJourneyProof";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("FOUNDER LIVE JOURNEY CLOSURE (deterministic)", () => {
  it("Jordan time→place→mutate→reverse never workflow-drifts", () => {
    const result = runFounderJordanJourney();
    if (!result.pass) {
      const failed = result.steps.filter((s) => !s.pass);
      // surface failures for diagnosis
      expect(failed.map((f) => `${f.name}: ${f.detail}`)).toEqual([]);
    }
    expect(result.pass).toBe(true);
    // critical founder bug dead
    const afterTime = result.steps.find((s) => s.name === "B_after_time_settled_place_gap");
    expect(afterTime?.pass).toBe(true);
    expect(afterTime?.cta?.toLowerCase()).toMatch(/place/);
    expect(afterTime?.cta?.toLowerCase()).not.toMatch(/time/);
  });

  it("place payload never time-only", () => {
    const result = runFounderJordanJourney();
    const p = result.steps.find((s) => s.name === "C_place_share_payload");
    expect(p?.pass).toBe(true);
  });

  it("four-surface consistency included Shared Reality", () => {
    const result = runFounderJordanJourney();
    const f = result.steps.find((s) => s.name === "F_four_surface_consistency");
    expect(f?.pass).toBe(true);
  });

  it("place→time order: time is next_gap, place preserved", () => {
    const result = runFounderJordanJourney();
    const p = result.steps.find((s) => s.name === "J0_place_then_time_gap");
    expect(p?.pass).toBe(true);
    expect(p?.cta?.toLowerCase()).toMatch(/time/);
  });

  it("product uses continuous orbital mark path (not historical flat arcs only)", () => {
    const brand = readFileSync(resolve(root, "src/brand/brand.ts"), "utf8");
    expect(brand).toMatch(/opal-mark-current\.png/);
    const mark = resolve(root, "public/brand/opal-mark-current.png");
    expect(existsSync(mark)).toBe(true);
    // historical arcs retained for audit trail / quarantine
    expect(
      existsSync(resolve(root, "public/brand/opal-mark-63-7-opposing-arcs-historical.png")) ||
        existsSync(resolve(root, "public/brand/_quarantine/REJECTED-arcs-spike-opal-current-mark.png")),
    ).toBe(true);
  });
});
