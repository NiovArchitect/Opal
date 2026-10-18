/**
 * Repair #18 C1 acceptance tests (design side, spec section 11):
 * state legibility + grammar coherence + honest fallbacks.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { PlanCard, PlanStatePill } from "./PlanCard";
import { PeopleChatsList, NextTogetherStrip } from "./C1Surfaces";
import {
  PLAN_STATES,
  STATE_META,
  attendanceLine,
  validatePlanProjection,
  whenLine,
  type PlanProjection,
} from "./planProjection";

const base: PlanProjection = {
  id: "p1",
  title: "Dinner at Juniper and Ivy",
  state: "ready",
  stateLabel: "Ready",
  primaryAction: { kind: "view", label: "View plan" },
  when: { kind: "canonical", label: "Thu, Oct 22 at 7:30 PM" },
  where: { kind: "place", name: "Juniper and Ivy", area: "North Park" },
  attendance: {
    going: 3, interested: 1, total: 4, viewerState: "going",
    faces: [{ name: "Maya Chen", initials: "MC" }],
  },
};

describe("C1 one plan card grammar", () => {
  it("same plan exposes the same data-plan-state in row, strip and thread sizes", () => {
    for (const size of ["row", "strip", "thread"] as const) {
      const html = renderToString(<PlanCard plan={base} size={size} />);
      expect(html).toContain('data-plan-state="ready"');
      expect(html).toContain("Ready");
      expect(html).toContain("3 of 4 going");
    }
  });

  it("every state renders its word and a distinct glyph (never color alone)", () => {
    const glyphs = new Set<string>();
    for (const state of PLAN_STATES) {
      const plan = { ...base, state, stateLabel: STATE_META[state].label };
      const html = renderToString(<PlanStatePill plan={plan} />);
      expect(html).toContain(STATE_META[state].label);
      glyphs.add(STATE_META[state].glyph);
    }
    expect(glyphs.size).toBe(5);
  });

  it("there is no pending state: pending never validates as a state of its own", () => {
    expect(PLAN_STATES).not.toContain("pending");
    // C1 1.4 deletes the pending token; C2 2.4 sends any unknown value to
    // the forming-safe "Needs a look" treatment - never a pending pill.
    const plan = validatePlanProjection({ ...base, state: "pending" });
    expect(plan?.state).not.toBe("pending");
    expect(plan?.state).toBe("forming");
    expect(plan?.stateLabel).toBe("Needs a look");
    const html = renderToString(<PlanCard plan={{ ...base, state: "pending" }} />);
    expect(html).not.toContain("Pending");
  });

  it("unknown state falls back to forming treatment labeled Needs a look", () => {
    const plan = validatePlanProjection({ ...base, state: "weird" });
    expect(plan?.state).toBe("forming");
    expect(plan?.stateLabel).toBe("Needs a look");
  });

  it("invalid payload renders the honest fallback, never a guessed card", () => {
    expect(validatePlanProjection({ id: "x" })).toBeNull();
    expect(validatePlanProjection(null)).toBeNull();
    const html = renderToString(<PlanCard plan={{ id: "x" }} />);
    expect(html).toContain("Plan details are not ready yet.");
    expect(html).not.toContain("7:30");
  });

  it("null attendance renders no count and no faces row, ever", () => {
    const plan = { ...base, attendance: null };
    expect(attendanceLine(plan)).toBeNull();
    const html = renderToString(<PlanCard plan={plan} />);
    expect(html).not.toContain("going");
    expect(html).not.toContain("c1-faces");
  });

  it("when lines are honest: labelOnly and unset never invent a time", () => {
    expect(whenLine({ ...base, when: { kind: "labelOnly", label: "Saturday" } })).toBe(
      "Time not set yet. Saturday was mentioned.",
    );
    expect(whenLine({ ...base, when: { kind: "unset" } })).toBe("Time not set yet.");
    expect(whenLine(base)).toBe("Thu, Oct 22 at 7:30 PM");
  });

  it("title never carries a baked schedule string from the projection contract", () => {
    const html = renderToString(<PlanCard plan={base} />);
    expect(html).toContain("Dinner at Juniper and Ivy");
    expect(html).not.toContain("Dinner Thursday");
  });

  it("chats row pill and Next Together strip use the same grammar", () => {
    const row = renderToString(
      <PeopleChatsList
        chats={[
          { id: "c1", name: "Maya Chen", initials: "MC", preview: "See you", timeLabel: "4:12 PM", unread: false, plan: base },
        ]}
      />,
    );
    expect(row).toContain('data-plan-state="ready"');
    expect(row).toContain("3 of 4 going");
    const strip = renderToString(<NextTogetherStrip plan={base} />);
    expect(strip).toContain('data-testid="next-together-strip"');
    expect(strip).toContain("NEXT TOGETHER");
    expect(strip).toContain('data-plan-state="ready"');
  });

  it("past plans render at the past treatment with the Past label", () => {
    const html = renderToString(
      <PlanCard plan={{ ...base, state: "past", stateLabel: "Past" }} />,
    );
    expect(html).toContain("c1-plan-past");
    expect(html).toContain("Past");
  });
});
