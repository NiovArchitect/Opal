/**
 * Repair #27 W27-6 — place-sheet meta composition pin (source leg).
 *
 * The R27 rendered frames pass (2026-10-22) caught a coming-plan
 * row on the Oceanside Farmers Market sheet rendering
 * "Action needed - - 2 of 6 going": the meta composed
 * `{stateLabel} - {whenLine}` unconditionally, so an empty
 * whenLine left a bare double dash. The law: meta segments join
 * only when present. The rendered leg is the place-sheet frame
 * in the r27 rendered output dir; this pin keeps the composition
 * from regressing to unconditional dashes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(resolve(__dirname, "PlaceStone.tsx"), "utf8");

describe("W27-6 place-sheet meta composition", () => {
  it("coming-plan meta joins only present segments", () => {
    expect(SRC).toContain(
      "[plan.stateLabel, plan.whenLine, plan.attendanceLine]",
    );
    expect(SRC).toMatch(/\[plan\.stateLabel, plan\.whenLine, plan\.attendanceLine\]\s*\.filter\(Boolean\)\s*\.join\(" - "\)/);
    // The unconditional composition that produced "- -" is gone.
    expect(SRC).not.toContain("{plan.stateLabel} - {plan.whenLine}");
  });

  it("happening meta joins only present segments", () => {
    expect(SRC).toMatch(/\["Happening", plan\.whenLine\]\.filter\(Boolean\)\.join\(" - "\)/);
    expect(SRC).not.toContain("Happening - {plan.whenLine}");
  });
});
