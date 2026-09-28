import { describe, expect, it } from "vitest";
import {
  interleavePlanHistory,
  isSettledPlan,
  nextPlanKicker,
  planConsequenceLabel,
  planHistory,
  planSurfaceState,
  selectHeaderPlan,
} from "./nextPlan";
import { relationshipHeaderLabel } from "./relationshipLabel";

const settled = {
  commitment: "execution_ready",
  change_quiet: true,
  plan_lines: ["Tuesday · Sep 29", "7:30 PM", "Fort Oak"],
  plan_set_event: { summary: "Tuesday · Sep 29 · 7:30 PM · Fort Oak", at: "2026-09-27T19:00:00Z" },
};

describe("settled plan leaves the thread", () => {
  it("treats a committed plan as settled and an open negotiation as inline", () => {
    expect(isSettledPlan(settled)).toBe(true);
    expect(isSettledPlan({ ...settled, change_proposal: { value: "8:00 PM" } })).toBe(true);
    expect(isSettledPlan({ commitment: "aligned", change_quiet: false, plan_lines: ["7:30 PM"] })).toBe(false);
  });

  it("reads the header from the current plan and history from the frozen event", () => {
    const changed = {
      ...settled,
      plan_lines: ["Tuesday · Sep 29", "8:00 PM", "Fort Oak"],
    };
    expect(selectHeaderPlan(changed.plan_lines)?.summary).toBe("Tuesday · Sep 29 · 8:00 PM · Fort Oak");
    expect(planHistory(changed)?.summary).toBe("Tuesday · Sep 29 · 7:30 PM · Fort Oak");
  });

  it("marks a settled approved plan Ready and a viewer's open decision Action", () => {
    expect(
      planSurfaceState({ commitment: "execution_ready", pendingChange: false, needsViewer: false }),
    ).toBe("ready");
    expect(
      planSurfaceState({ commitment: "execution_ready", needsViewer: true }),
    ).toBe("action");
    expect(planSurfaceState({ commitment: "aligning" })).toBe("forming");
    expect(
      planConsequenceLabel({
        state: "ready",
        whenLabel: "Tuesday · Sep 29 · 7:30 PM",
        place: "Fort Oak",
      }),
    ).toBe("Ready · Tue Sep 29 7:30 PM · Fort Oak");
  });

  it("keeps the history event before messages that arrived later", () => {
    const items = interleavePlanHistory(
      [
        { id: "old", createdAt: "2026-09-27T18:00:00Z" },
        { id: "new", createdAt: "2026-09-27T20:00:00Z" },
      ],
      planHistory(settled),
    );
    expect(items.map((item) => (item.kind === "message" ? item.message.id : "plan"))).toEqual([
      "old",
      "plan",
      "new",
    ]);
  });

  it("names solo plans NEXT and shared plans NEXT TOGETHER", () => {
    expect(nextPlanKicker("solo", "Sun · 10 AM · Church")).toBe("NEXT");
    expect(nextPlanKicker("dyad", "Tue · 7:30 PM · Fort Oak")).toBe("NEXT TOGETHER");
    expect(nextPlanKicker("group", "Tonight · 7:30 PM")).toBe("TONIGHT");
  });
});

describe("relationship labels stay conservative", () => {
  it("shows nothing when the relationship is unknown or only inferred", () => {
    expect(relationshipHeaderLabel(null)).toBeNull();
    expect(
      relationshipHeaderLabel({
        status: "candidate",
        explicit: false,
        viewerLabel: "Girlfriend",
        canonicalType: "girlfriend",
        source: "inferred",
      }),
    ).toBeNull();
  });

  it("shows a confirmed directional label only to the viewer who owns it", () => {
    expect(
      relationshipHeaderLabel({
        status: "confirmed",
        explicit: true,
        canonicalType: "parent_child",
        source: "explicit",
        privacy: "participants",
        sharedLabel: "Daughter",
      }),
    ).toBe("Daughter");
  });

  it("does not leak one person's private label", () => {
    expect(
      relationshipHeaderLabel({
        status: "confirmed",
        explicit: true,
        canonicalType: "dating",
        source: "explicit",
        privacy: "private",
        viewerLabel: "",
        sharedLabel: "Girlfriend",
      }),
    ).toBeNull();
  });

  it("refuses an inferred romantic label", () => {
    expect(
      relationshipHeaderLabel({
        status: "confirmed",
        explicit: true,
        canonicalType: "girlfriend",
        source: "inferred",
        privacy: "participants",
        sharedLabel: "Girlfriend",
      }),
    ).toBeNull();
  });
});
