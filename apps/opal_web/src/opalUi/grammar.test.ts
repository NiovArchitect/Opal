import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  contextChipLabel,
  contextualSharedCopy,
  FORBIDDEN_PRESSURE_PHRASES,
  privateGuidanceCopy,
  RELATIONSHIP_PULSE_EXPERIMENT,
  shouldShowOpalEdge,
  violatesPressureCopy,
} from "./grammar";

const root = resolve(__dirname, "..");

describe("Opal UI grammar", () => {
  it("context chip absent when quiet / no signal", () => {
    expect(contextChipLabel({})).toBeNull();
    expect(contextChipLabel({ signalKind: "ready" })).toBeNull();
    expect(contextChipLabel({ signalKind: "set" })).toBeNull();
  });

  it("context chip appears for plan_forming / open_loop / overlap", () => {
    expect(contextChipLabel({ signalKind: "plan_forming" })).toBe("Find a time");
    expect(contextChipLabel({ signalKind: "open_loop" })).toBe("Find a time");
    expect(
      contextChipLabel({
        overlap: {
          label: "One time works for both of you.",
          overlap_status: "overlap_found",
          overlaps: [
            {
              display_start: "a",
              display_end: "b",
              timezone: "UTC",
              shared_safe: true,
            },
          ],
          no_private_schedule: true,
        },
      }),
    ).toBe("See that time");
  });

  it("Opal Edge only for useful states", () => {
    expect(shouldShowOpalEdge({})).toBe(false);
    expect(shouldShowOpalEdge({ signalKind: "plan_forming" })).toBe(true);
    expect(
      shouldShowOpalEdge({
        signalKind: "plan_forming",
        findTimeOpen: true,
      }),
    ).toBe(false);
  });

  it("private guidance is first-person, never peer-pressure", () => {
    const g = privateGuidanceCopy({
      overlap: {
        label: "x",
        overlap_status: "overlap_found",
        overlaps: [{ display_start: "a", display_end: "b", timezone: "UTC", shared_safe: true }],
        no_private_schedule: true,
      },
    });
    expect(g?.text).toMatch(/Want a couple ideas/);
    expect(violatesPressureCopy(g!.text)).toBe(false);
    for (const p of FORBIDDEN_PRESSURE_PHRASES) {
      expect(violatesPressureCopy(`Still ${p}`)).toBe(true);
    }
  });

  it("vibe copy for still_open is not always literal Still open", () => {
    expect(contextualSharedCopy("still_open", { overlapCount: 1 })).toBe(
      "This could work",
    );
    expect(contextualSharedCopy("still_open", { overlapCount: 2 })).toBe(
      "A couple options fit",
    );
  });

  it("Relationship Pulse stays experiment-off in production grammar", () => {
    expect(RELATIONSHIP_PULSE_EXPERIMENT).toBe(false);
  });

  it("shared styles do not give dominant violet to shared labels", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    // private guidance owns #8b5cf6 / #c4b5fd
    expect(css).toMatch(/opal-private-guidance/);
    expect(css).toMatch(/#8b5cf6|#8B5CF6/i);
    // shared overlap uses iris/cyan family, not private label color as primary
    const shared = css.slice(
      css.indexOf("signal-availability_overlap"),
      css.indexOf("signal-availability_overlap") + 350,
    );
    expect(shared).not.toMatch(/#c4b5fd/);
  });

  it("OpalApp wires edge, context chip, private guidance, expand", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/opal-edge/);
    expect(app).toMatch(/ContextChip/);
    expect(app).toMatch(/PrivateGuidance/);
    expect(app).toMatch(/opal-moment-expand/);
    expect(app).toMatch(/RELATIONSHIP_PULSE_EXPERIMENT/);
  });
});
