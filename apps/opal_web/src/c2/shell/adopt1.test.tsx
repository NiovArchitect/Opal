/**
 * @vitest-environment jsdom
 *
 * Repair #18 adoption wave 1 - web regressions for the graph/people
 * cluster:
 * - ST-A / 4.C10 / ST-B sections render the server projection's
 *   finished strings verbatim (intentions with their status lines and
 *   the no-scoring framing, goals with derived status, the shelf with
 *   starters carrying their basis lines and sparks with promote /
 *   promoted state) - the surface derives nothing.
 * - Promote and starter taps call the named event with the named id.
 * - ST-G: detailWithHistory folds the history projection's Who list
 *   and history lines into the detail verbatim, and the attendance
 *   line comes from the same counts the endpoint serves.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Graphs, type C2GraphsEvents } from "./C2Graphs";
import { detailFromPlan, detailWithHistory, graphListFromPlans } from "./shellData";
import type { GraphListProjection } from "./projections";
import type { PlanHistoryContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

function q(selector: string) {
  return host!.querySelector(selector);
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const baseEvents: C2GraphsEvents = {
  openGraph: () => undefined,
  createPlan: () => undefined,
  createTrip: () => undefined,
  createIdea: () => undefined,
  completeSlot: () => undefined,
  dropPlan: async () => null,
  runNextAction: () => undefined,
  addPeople: () => undefined,
  openChatForPlan: () => undefined,
  back: () => undefined,
};

function projectionWithAdopt1(): GraphListProjection {
  return {
    ...graphListFromPlans([]),
    adopt1: {
      people: [{ id: "u-b", name: "Maya B" }],
      intentions: [
        {
          id: "i1",
          title: "See Maya every month",
          subject_user_id: "u-b",
          subject_name: "Maya B",
          cadence_days: 30,
          kept_count: 1,
          last_kept: { plan_id: "p1", title: "Monthly dinner", when_label: null, at: "2026-09-08T00:00:00Z" },
          next_window_at: "2026-10-08T00:00:00Z",
          missed: true,
          missed_needs_surface: true,
          status_line:
            "Last time you kept a plan with Maya B: Monthly dinner. The window you set for the next one passed around Oct 08.",
          created_at: "2026-09-01T00:00:00Z",
        },
      ],
      goals: [
        {
          id: "g1",
          title: "See Dad monthly",
          linked_plan_ids: [],
          linked_count: 0,
          completed_count: 0,
          last_completed: null,
          next_upcoming: null,
          status_line:
            "No plans linked yet. Link a plan and this will keep itself up to date from it - Opal does not guess progress.",
          created_at: "2026-09-01T00:00:00Z",
        },
      ],
      shelf: {
        starters: [
          {
            id: "celebration-c1",
            kind: "celebration",
            title: "Plan something for June B",
            basis_line: "You saved June B's birthday - it is coming up on Oct 28.",
            basis_ref: "c1",
            prefill: { title: "Something for June B's birthday", participant_user_ids: [] },
          },
        ],
        sparks: [
          {
            id: "s1",
            title: "Picnic at the lake",
            state: "spark",
            promoted_plan: null,
            prefill: { title: "Picnic at the lake", location: null, time_label: null, participant_user_ids: [] },
            created_at: "2026-09-01T00:00:00Z",
          },
          {
            id: "s2",
            title: "Museum morning",
            state: "promoted",
            promoted_plan: { plan_id: "p9", title: "Museum morning", status: "tentative" },
            prefill: { title: "Museum morning", location: null, time_label: null, participant_user_ids: [] },
            created_at: "2026-09-01T00:00:00Z",
          },
        ],
      },
    },
  };
}

describe("adoption wave 1 - Graphs sections", () => {
  it("renders intentions, goals, and the shelf verbatim from the projection", async () => {
    await render(<C2Graphs projection={projectionWithAdopt1()} events={baseEvents} />);

    const intentions = q('[data-testid="c2-graphs-intentions"]');
    expect(intentions?.textContent).toContain("See Maya every month");
    expect(intentions?.textContent).toContain("With Maya B");
    expect(intentions?.textContent).toContain("The window you set for the next one passed around Oct 08.");
    // The guardrail framing is on the surface: the owner's rhythm only.
    expect(intentions?.textContent).toContain("never anyone else");

    const goals = q('[data-testid="c2-graphs-goals"]');
    expect(goals?.textContent).toContain("See Dad monthly");
    expect(goals?.textContent).toContain("Opal does not guess progress.");

    const shelf = q('[data-testid="c2-graphs-shelf"]');
    expect(shelf?.textContent).toContain("Someday - the shelf");
    expect(shelf?.textContent).toContain("You saved June B's birthday - it is coming up on Oct 28.");
    expect(shelf?.textContent).toContain("Picnic at the lake");
    expect(q('[data-testid="c2-spark-promoted"]')?.textContent).toContain("Became a plan: Museum morning");
  });

  it("promote and starter taps fire the named event with the named id", async () => {
    const promoteSpark = vi.fn(async () => undefined);
    const startStarter = vi.fn();
    await render(
      <C2Graphs
        projection={projectionWithAdopt1()}
        events={{ ...baseEvents, promoteSpark, startStarter }}
      />,
    );
    await click(q('[data-testid="c2-spark-promote"]')!);
    expect(promoteSpark).toHaveBeenCalledWith("s1");
    await click(q('[data-testid="c2-starter-start"]')!);
    expect(startStarter).toHaveBeenCalledWith("celebration-c1");
  });

  it("without the adopt1 projection the sections are absent, not painted", async () => {
    await render(<C2Graphs projection={graphListFromPlans([])} events={baseEvents} />);
    expect(q('[data-testid="c2-graphs-intentions"]')).toBeNull();
    expect(q('[data-testid="c2-graphs-goals"]')).toBeNull();
    expect(q('[data-testid="c2-graphs-shelf"]')).toBeNull();
  });
});

describe("adoption wave 1 - ST-G detail history fold", () => {
  it("folds Who, history, and the counts line verbatim", () => {
    const plan = {
      id: "p1",
      title: "Dinner at Juniper",
      status: "agreed",
      time_label: "Saturday 7:30 PM",
      location: "Juniper and Ivy",
    } as Parameters<typeof detailFromPlan>[0];
    const detail = detailFromPlan(plan, "graphs", "u-a");
    const history: PlanHistoryContract = {
      plan_id: "p1",
      history: [
        { line: "Hist B said they are going.", kind: "answered", at: "2026-10-10T00:00:00Z" },
        { line: "Created by Hist A.", kind: "created", at: "2026-10-09T00:00:00Z" },
      ],
      who: [
        { user_id: "u-a", name: "Hist A", role: "lead", response_state: "accepted", response_label: "Going" },
        { user_id: "u-b", name: "Hist B", role: "participant", response_state: "accepted", response_label: "Going" },
      ],
      counts: { going_count: 2, total_count: 2, viewer_state: "accepted" },
    };
    const folded = detailWithHistory(detail, history);
    expect(folded.who.map((w) => w.name)).toEqual(["Hist A", "Hist B"]);
    expect(folded.who.map((w) => w.responseLabel)).toEqual(["Going", "Going"]);
    expect(folded.history.map((h) => h.line)).toEqual([
      "Hist B said they are going.",
      "Created by Hist A.",
    ]);
    expect(folded.attendanceLine).toBe("2 of 2 going");
  });
});
