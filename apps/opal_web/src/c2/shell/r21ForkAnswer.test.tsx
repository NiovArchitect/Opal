/**
 * @vitest-environment jsdom
 *
 * Repair #21 (W-5a) - the fork-answer surface pins.
 *
 * The fork's two answers finally have a rendered home. These pins
 * hold the rendering law to the etiquette projection alone:
 *  - the control renders ONLY for the fork's actual recipient while
 *    the fork is live (sender: never; bystander: never; after
 *    resolution: never);
 *  - it lives where the fork presentation lives - the Graphs plan
 *    card and the plan detail;
 *  - a click drives the EXISTING respond endpoint client
 *    (respondPlanEtiquette) with the machinery's action vocabulary,
 *    and the surface re-renders from the returned plan;
 *  - a refusal surfaces as the server's own plain line.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  OpalPlanContract,
  PlanEtiquetteContract,
} from "../../api/productClient";

const respondMock = vi.fn();
vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    respondPlanEtiquette: (...args: unknown[]) => respondMock(...args),
  };
});

import { ForkAnswerControl } from "../../opalUi/ForkAnswerControl";
import { C2Graphs, C2GraphDetail, type C2GraphsEvents } from "./C2Graphs";
import { detailFromPlan, graphListFromPlans } from "./shellData";

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

beforeEach(() => {
  respondMock.mockReset();
});

// --- Contract-shaped etiquette (the backend viewer_projection wire
// shape at the forked stage) ----------------------------------------

function etiquetteFor(
  role: string,
  overrides: Partial<PlanEtiquetteContract> = {},
): PlanEtiquetteContract {
  return {
    plan_id: "plan-r21",
    plan_title: "Dinner at Juniper",
    viewer_role: role,
    requester_user_id: "u-cara",
    recipient_user_id: "u-sam",
    lifecycle_open: true,
    stage: "forked",
    fork: { state: "presented", available: role === "recipient" },
    limbo: {
      state: "limbo",
      treatment: "cooling",
      pattern_channel: "cooling-lines",
      window_fraction_remaining: 0.5,
      copy:
        role === "recipient"
          ? "Your answer window for Dinner at Juniper is still open. A yes or a no is plenty - either answer is a kind one."
          : "Waiting to hear back about Dinner at Juniper. We will share the answer as soon as it arrives.",
    },
    window: {
      set: false,
      closes_at: null,
      seconds: null,
      available: false,
      unavailable_reason: null,
    },
    decline_available: role === "recipient",
    fork_available: role === "recipient",
    ...overrides,
  };
}

const resolvedEtiquette = etiquetteFor("recipient", {
  lifecycle_open: false,
  stage: null,
  fork: { state: "none", available: false },
  limbo: null,
  fork_available: false,
});

function planWith(etiquette: PlanEtiquetteContract | null): OpalPlanContract {
  return {
    id: "plan-r21",
    title: "Dinner at Juniper",
    status: "tentative",
    time_label: "Saturday at 7:30 PM",
    location: "Juniper & Ivy",
    start_at: "2026-10-25T19:00:00Z",
    timezone: "UTC",
    etiquette,
  } as OpalPlanContract;
}

const events: C2GraphsEvents = {
  openGraph: vi.fn(),
  createPlan: vi.fn(),
  createTrip: vi.fn(),
  createIdea: vi.fn(),
  completeSlot: vi.fn(),
  dropPlan: vi.fn(async () => null),
  forkAnswered: vi.fn(),
  runNextAction: vi.fn(),
  addPeople: vi.fn(),
  openChatForPlan: vi.fn(),
  back: vi.fn(),
};

describe("R21 ForkAnswerControl - renders only for the recipient while the fork is live", () => {
  it("recipient + live fork: both answers, with the standing words", async () => {
    const container = await render(
      <ForkAnswerControl planId="plan-r21" etiquette={etiquetteFor("recipient")} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='fork-answer']")).not.toBeNull();
    expect(container.querySelector("[data-testid='fork-answer-decline']")?.textContent).toBe(
      "Let it go",
    );
    expect(
      container.querySelector("[data-testid='fork-answer-another-time']")?.textContent,
    ).toBe("Ask for another time");
  });

  it("sender: no answer controls on their own fork", async () => {
    const container = await render(
      <ForkAnswerControl planId="plan-r21" etiquette={etiquetteFor("requester")} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='fork-answer']")).toBeNull();
  });

  it("bystander group member: no answer controls", async () => {
    const container = await render(
      <ForkAnswerControl
        planId="plan-r21"
        etiquette={etiquetteFor("group_member")}
        bearer="tok"
      />,
    );
    expect(container.querySelector("[data-testid='fork-answer']")).toBeNull();
  });

  it("after resolution: the control is gone", async () => {
    const container = await render(
      <ForkAnswerControl planId="plan-r21" etiquette={resolvedEtiquette} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='fork-answer']")).toBeNull();
  });

  it("no etiquette fact at all: nothing renders", async () => {
    const container = await render(
      <ForkAnswerControl planId="plan-r21" etiquette={null} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='fork-answer']")).toBeNull();
  });
});

describe("R21 ForkAnswerControl - a click drives the real respond contract", () => {
  it("Ask for another time calls respondPlanEtiquette with the machinery's action and re-renders from the returned plan", async () => {
    const returnedPlan = planWith(resolvedEtiquette);
    respondMock.mockResolvedValue({ ok: true, plan: returnedPlan, outcome: "another_time" });
    const onUpdated = vi.fn();
    const container = await render(
      <ForkAnswerControl
        planId="plan-r21"
        etiquette={etiquetteFor("recipient")}
        bearer="tok"
        onUpdated={onUpdated}
      />,
    );
    const button = container.querySelector(
      "[data-testid='fork-answer-another-time']",
    ) as HTMLButtonElement;
    await act(async () => {
      button.click();
    });
    expect(respondMock).toHaveBeenCalledWith("plan-r21", "ask_another_time", "tok");
    expect(onUpdated).toHaveBeenCalledWith(returnedPlan);
    expect(container.querySelector("[data-testid='fork-answer-done']")?.textContent).toBe(
      "You asked if another time could work.",
    );
    // The answers stand down once answered.
    expect(container.querySelector("[data-testid='fork-answer-decline']")).toBeNull();
  });

  it("Let it go calls the decline action", async () => {
    respondMock.mockResolvedValue({
      ok: true,
      plan: planWith(null),
      outcome: "closed",
    });
    const container = await render(
      <ForkAnswerControl planId="plan-r21" etiquette={etiquetteFor("recipient")} bearer="tok" />,
    );
    const button = container.querySelector(
      "[data-testid='fork-answer-decline']",
    ) as HTMLButtonElement;
    await act(async () => {
      button.click();
    });
    expect(respondMock).toHaveBeenCalledWith("plan-r21", "decline", "tok");
    expect(container.querySelector("[data-testid='fork-answer-done']")?.textContent).toBe(
      "You let this one go.",
    );
  });

  it("a refusal surfaces as the server's plain line, and the control stays", async () => {
    const refusal = new Error("Request failed") as Error & { serverMessage?: string };
    refusal.serverMessage = "There is nothing waiting on you for this plan right now.";
    respondMock.mockRejectedValue(refusal);
    const container = await render(
      <ForkAnswerControl planId="plan-r21" etiquette={etiquetteFor("recipient")} bearer="tok" />,
    );
    const button = container.querySelector(
      "[data-testid='fork-answer-decline']",
    ) as HTMLButtonElement;
    await act(async () => {
      button.click();
    });
    expect(container.querySelector("[data-testid='fork-answer-error']")?.textContent).toBe(
      "There is nothing waiting on you for this plan right now.",
    );
    expect(container.querySelector("[data-testid='fork-answer-another-time']")).not.toBeNull();
  });
});

describe("R21 fork-answer surface - the Graphs card and the plan detail", () => {
  const NOW = new Date("2026-10-19T17:00:00Z");

  it("the Graphs card carries the control for the recipient", async () => {
    const projection = graphListFromPlans([planWith(etiquetteFor("recipient"))], NOW);
    const container = await render(
      <C2Graphs projection={projection} events={events} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='fork-answer']")).not.toBeNull();
    // The fork presentation (limbo) and its answers now live together.
    expect(container.querySelector("[data-testid='c2-plan-limbo']")).not.toBeNull();
  });

  it("the Graphs card carries NO control for the sender", async () => {
    const projection = graphListFromPlans([planWith(etiquetteFor("requester"))], NOW);
    const container = await render(
      <C2Graphs projection={projection} events={events} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='c2-plan-limbo']")).not.toBeNull();
    expect(container.querySelector("[data-testid='fork-answer']")).toBeNull();
  });

  it("the plan detail carries the control for the recipient", async () => {
    const detail = detailFromPlan(planWith(etiquetteFor("recipient")), "graphs");
    await render(<C2GraphDetail detail={detail} events={events} bearer="tok" />);
    // The detail renders through TopLayer's portal on document.body.
    expect(document.body.querySelector("[data-testid='c2-graph-detail']")).not.toBeNull();
    expect(document.body.querySelector("[data-testid='fork-answer']")).not.toBeNull();
    expect(
      document.body.querySelector("[data-testid='fork-answer-another-time']")?.textContent,
    ).toBe("Ask for another time");
  });

  it("the plan detail carries NO control once the fork has resolved", async () => {
    const detail = detailFromPlan(planWith(resolvedEtiquette), "graphs");
    await render(<C2GraphDetail detail={detail} events={events} bearer="tok" />);
    expect(document.body.querySelector("[data-testid='c2-graph-detail']")).not.toBeNull();
    expect(document.body.querySelector("[data-testid='fork-answer']")).toBeNull();
  });
});
