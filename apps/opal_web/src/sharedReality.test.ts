import { describe, expect, it } from "vitest";
import type { ProductSignal } from "./api/productClient";
import {
  formatHumanTime,
  isConsequentialNeed,
  isDurableForPlans,
  presenceLines,
  strongestPerConversation,
  surfaceLabel,
} from "./sharedReality";

function sig(partial: Partial<ProductSignal> & { kind: string; label: string }): ProductSignal {
  return {
    status: "possibility",
    ...partial,
  };
}

describe("sharedReality presentation", () => {
  it("presenceLines never surfaces Set / Still open / Needs you", () => {
    const lines = presenceLines({
      lifecycle_stage: "still_open",
      label: "Still open",
      shared_reality: {
        what: "Dinner",
        when: "Thursday after 6:30",
        gaps: ["place"],
        headline: "Dinner · Thursday after 6:30",
        usable: false,
      },
      conversation_id: "c1",
    } as ProductSignal);
    expect(lines.title.toLowerCase()).not.toMatch(/\bset\b|needs you/);
    // "Place still open" is human place-gap language, not lifecycle "Still open"
    expect(lines.gap || lines.detail).toMatch(/place|Dinner|open/i);
    expect(lines.title).not.toBe("Still open");
  });

  it("never surfaces internal Set/Still open tokens when headline exists", () => {
    const s = sig({
      kind: "set",
      label: "Dinner · Thursday · Harbor Table",
      lifecycle_stage: "set",
      shared_reality: {
        headline: "Dinner · Thursday · Harbor Table",
        sufficiency: "usable",
        ui_job: "reveal",
      },
    });
    expect(surfaceLabel(s)).toBe("Dinner · Thursday · Harbor Table");
    expect(surfaceLabel(s)).not.toMatch(/^Set$/i);
  });

  it("guards against stage-token labels", () => {
    const s = sig({
      kind: "set",
      label: "Set",
      lifecycle_stage: "set",
      detail: "Thursday · 7:00",
    });
    expect(surfaceLabel(s)).not.toMatch(/^Set$/i);
  });

  it("plans exclude weak intention and proposal rows", () => {
    const intention = sig({
      kind: "plan_forming",
      label: "Coffee · forming",
      lifecycle_stage: "plan_forming",
      shared_reality: { sufficiency: "intention", what: "Coffee" },
    });
    const proposal = sig({
      kind: "proposal",
      label: "Coffee",
      lifecycle_stage: "still_open",
    });
    const firm = sig({
      kind: "set",
      label: "Coffee · Tuesday · 10:30 · Communal",
      lifecycle_stage: "set",
      conversation_id: "c1",
      shared_reality: { sufficiency: "usable", what: "Coffee", when: "Tuesday" },
    });
    expect(isDurableForPlans(intention)).toBe(false);
    expect(isDurableForPlans(proposal)).toBe(false);
    expect(isDurableForPlans(firm)).toBe(true);
  });

  it("dedupes to one strongest signal per conversation", () => {
    const list = [
      sig({
        kind: "proposal",
        label: "Dinner",
        conversation_id: "c1",
        lifecycle_stage: "still_open",
      }),
      sig({
        kind: "open_loop",
        label: "Dinner · Thursday",
        conversation_id: "c1",
        lifecycle_stage: "still_open",
      }),
      sig({
        kind: "set",
        label: "Dinner · Thursday · Harbor",
        conversation_id: "c2",
        lifecycle_stage: "set",
      }),
    ];
    const strong = strongestPerConversation(list);
    expect(strong).toHaveLength(2);
    expect(strong.find((s) => s.conversation_id === "c1")?.kind).toBe("open_loop");
  });

  it("needs you only for consequential resolve/execute", () => {
    const resolve = sig({
      kind: "open_loop",
      label: "Dinner · need a place",
      lifecycle_stage: "still_open",
      requires_user_action: true,
      ui_job: "resolve",
    });
    const quietSet = sig({
      kind: "set",
      label: "Dinner · Thursday · Harbor",
      lifecycle_stage: "set",
      requires_user_action: false,
      ui_job: "reveal",
      shared_reality: { sufficiency: "usable", ui_job: "reveal" },
    });
    expect(isConsequentialNeed(resolve)).toBe(true);
    expect(isConsequentialNeed(quietSet)).toBe(false);
  });

  it("formats ISO timestamps for humans", () => {
    const today = new Date();
    today.setHours(14, 30, 0, 0);
    expect(formatHumanTime(today.toISOString())).toMatch(/\d/);
    expect(formatHumanTime("2:14 PM")).toBe("2:14 PM");
  });
});
