/**
 * Founder Polish, Cluster G (P10c) - leave-by web pins.
 *
 * The surfaces render the backend's ONE leave-by projection
 * verbatim (LeaveByProjection): no client derives a time, a
 * distance, or the urgency. Pins:
 *  - thread strip: a computed leave-by renders its finished
 *    spoken-style label; absent states render NOTHING in the strip
 *    (their honest line lives on the plan detail, where there is
 *    room - the strip stays quiet);
 *  - escalation: at the backend's leave_now urgency the strip's
 *    treatment escalates to the existing action color + solid-bold
 *    pattern (ready gold -> action), and the words change with it -
 *    never a color-only cue, never a new color;
 *  - plan detail: the section renders the finished line + the
 *    honesty meta (duration, distance, "Estimate - typical
 *    traffic, not live"); the no-location state renders its honest
 *    line with NO numbers; a virtual plan renders no section.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LeaveByProjection, NextPlanFact } from "../../api/productClient";
import { PLAN_STATE_HEX } from "../../theme/planStateColors";
import { PlanAwareness } from "./PlanAwareness";
import { C2GraphDetail, type C2GraphsEvents } from "../../c2/shell/C2Graphs";
import { detailFromPlan } from "../../c2/shell/shellData";
import type { OpalPlanContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LEAVE_BY_OK: LeaveByProjection = {
  state: "ok",
  label: "Leave by 6:40 PM to arrive calm - 25 min drive, 7.5 mi (estimate, includes a 10 min buffer)",
  urgency: "on_track",
  leave_by_at: "2026-10-24T18:40:00Z",
  leave_by_label: "6:40 PM",
  travel_duration_seconds: 1500,
  travel_duration_label: "25 min",
  travel_distance_m: 12000,
  travel_distance_label: "7.5 mi",
  traffic_class: "estimate",
  traffic_label: "Estimate - typical traffic, not live",
  buffer_seconds: 600,
  provider: "geoapify",
  computed_at: "2026-10-24T17:00:00Z",
};

const LEAVE_BY_NOW: LeaveByProjection = {
  ...LEAVE_BY_OK,
  label: "Leave now to arrive on time - the drive is about 25 min (estimate)",
  urgency: "leave_now",
};

const FACT: NextPlanFact = {
  plan_id: "plan-lb-1",
  title: "Dinner at Juniper",
  when_label: "Saturday 7:30 PM",
  starts_at: null,
  where_label: "Juniper and Ivy",
  where_kind: "physical",
  status: "agreed",
  state: "ready",
  conversation_id: "conv-1",
};

describe("Cluster G - thread strip leave-by", () => {
  it("renders the finished leave-by line in the strip variant only", () => {
    const strip = renderToString(
      <PlanAwareness fact={{ ...FACT, leave_by: LEAVE_BY_OK }} variant="strip" />,
    );
    expect(strip).toContain('data-testid="plan-awareness-leaveby"');
    expect(strip).toContain("Leave by 6:40 PM to arrive calm");
    expect(strip).not.toContain('data-leave-now="1"');
    // The row/call variants do not carry the segment (strip only).
    const row = renderToString(
      <PlanAwareness fact={{ ...FACT, leave_by: LEAVE_BY_OK }} variant="row" />,
    );
    expect(row).not.toContain('data-testid="plan-awareness-leaveby"');
  });

  it("absent states render no segment in the strip - quiet, not noisy", () => {
    for (const state of ["needs_location_share", "no_place_coordinates", "unavailable"]) {
      const html = renderToString(
        <PlanAwareness
          fact={{ ...FACT, leave_by: { ...LEAVE_BY_OK, state, label: "honest line" } }}
          variant="strip"
        />,
      );
      expect(html).not.toContain('data-testid="plan-awareness-leaveby"');
      expect(html).not.toContain("honest line");
    }
    const noLb = renderToString(<PlanAwareness fact={FACT} variant="strip" />);
    expect(noLb).not.toContain("plan-awareness-leaveby");
  });

  it("escalation: leave_now flips the treatment to the existing action color + solid-bold pattern", () => {
    const html = renderToString(
      <PlanAwareness fact={{ ...FACT, leave_by: LEAVE_BY_NOW }} variant="strip" />,
    );
    expect(html).toContain('data-leave-now="1"');
    expect(html).toContain('data-pattern="solid-bold"');
    expect(html).toContain(PLAN_STATE_HEX.action);
    expect(html).not.toContain(PLAN_STATE_HEX.ready);
    // The words change too - never a color-only cue.
    expect(html).toContain("Leave now to arrive on time");
  });

  it("on_track keeps the plan's ready treatment (gold, solid)", () => {
    const html = renderToString(
      <PlanAwareness fact={{ ...FACT, leave_by: LEAVE_BY_OK }} variant="strip" />,
    );
    expect(html).toContain('data-pattern="solid"');
    expect(html).toContain(PLAN_STATE_HEX.ready);
  });
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container?.remove();
  container = null;
});

const events: C2GraphsEvents = {
  openGraph: () => {},
  createPlan: () => {},
  createTrip: () => {},
  createIdea: () => {},
  completeSlot: () => {},
  dropPlan: async () => null,
  runNextAction: () => {},
  addPeople: () => {},
  openChatForPlan: () => {},
  back: () => {},
};

const PHYSICAL: OpalPlanContract = {
  id: "plan-lb-detail",
  title: "Dinner",
  status: "agreed",
  location: "Juniper & Ivy",
  plan_type: "in_person",
  time_label: "Sat 7pm",
};

async function renderDetail(leaveBy: LeaveByProjection | null) {
  const detail = { ...detailFromPlan(PHYSICAL, "graphs"), leaveBy };
  await act(async () => {
    root!.render(<C2GraphDetail detail={detail} events={events} />);
  });
  return document.body;
}

describe("Cluster G - plan detail leave-by", () => {
  it("renders the finished line and the honesty meta verbatim", async () => {
    const body = await renderDetail(LEAVE_BY_OK);
    const section = body.querySelector('[data-testid="c2-detail-leaveby"]');
    expect(section).toBeTruthy();
    expect(section!.getAttribute("data-leave-by-state")).toBe("ok");
    expect(section!.getAttribute("data-urgency")).toBe("on_track");
    expect(body.querySelector('[data-testid="c2-detail-leaveby-line"]')!.textContent).toContain(
      "Leave by 6:40 PM to arrive calm",
    );
    const meta = body.querySelector('[data-testid="c2-detail-leaveby-meta"]')!.textContent!;
    expect(meta).toContain("25 min drive");
    expect(meta).toContain("7.5 mi");
    expect(meta).toContain("Estimate - typical traffic, not live");
  });

  it("escalated: leave_now line takes the existing action color", async () => {
    const body = await renderDetail(LEAVE_BY_NOW);
    const section = body.querySelector('[data-testid="c2-detail-leaveby"]')!;
    expect(section.getAttribute("data-urgency")).toBe("leave_now");
    const line = body.querySelector(
      '[data-testid="c2-detail-leaveby-line"]',
    ) as HTMLElement;
    expect(line.textContent).toContain("Leave now to arrive on time");
    expect(line.style.color).toBeTruthy();
    expect(line.style.color.replace(/\s/g, "")).toContain("255,77,94");
  });

  it("no-location state: the honest line renders, with no numbers anywhere", async () => {
    const body = await renderDetail({
      state: "needs_location_share",
      label: "Share your location to see when to leave",
      urgency: null,
      leave_by_at: null,
      travel_duration_seconds: null,
      travel_distance_m: null,
      traffic_class: null,
    });
    const section = body.querySelector('[data-testid="c2-detail-leaveby"]')!;
    expect(section).toBeTruthy();
    expect(section.getAttribute("data-leave-by-state")).toBe("needs_location_share");
    expect(section.textContent).toContain("Share your location to see when to leave");
    expect(body.querySelector('[data-testid="c2-detail-leaveby-meta"]')).toBeNull();
  });

  it("virtual plan (not_applicable) and absent projection render no section", async () => {
    let body = await renderDetail({ state: "not_applicable", label: "online" });
    expect(body.querySelector('[data-testid="c2-detail-leaveby"]')).toBeNull();
    body = await renderDetail(null);
    expect(body.querySelector('[data-testid="c2-detail-leaveby"]')).toBeNull();
  });
});
