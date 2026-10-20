/**
 * @vitest-environment jsdom
 *
 * I2 etiquette wiring - web chain pins.
 *
 * 1. The card model carries limbo from a contract-shaped payload:
 *    shellData.cardFromPlan maps the plan contract's etiquette
 *    projection (snake_case wire shape, verbatim from the backend's
 *    viewer_projection) into PlanCardC2Input.limbo for BOTH viewer
 *    roles, each with their own finished copy - and to null when the
 *    contract carries no limbo fact.
 * 2. The creator's response-window control (PlanEditControls'
 *    ResponseWindowControl) renders only where the machinery
 *    supports it, sets through the real client function, re-renders
 *    from the returned payload, and surfaces a gate refusal as the
 *    server's plain line - never a silent drop.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpalPlanContract, PlanEtiquetteContract } from "../../api/productClient";
import { cardFromPlan, limboFromPlan } from "./shellData";

const setWindowMock = vi.fn();
vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    setPlanResponseWindow: (...args: unknown[]) => setWindowMock(...args),
  };
});

import { ResponseWindowControl } from "../../opalUi/PlanEditControls";

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
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  host?.remove();
  host = null;
  root = null;
});

beforeEach(() => {
  setWindowMock.mockReset();
});

// --- Contract-shaped payloads (the backend viewer_projection wire
// shape, copied field for field) -------------------------------------

function etiquetteFor(role: string, copy: string): PlanEtiquetteContract {
  return {
    plan_id: "plan-i2",
    plan_title: "Dinner at Juniper",
    viewer_role: role,
    requester_user_id: "user-cara",
    recipient_user_id: "user-sam",
    lifecycle_open: true,
    stage: "nudged",
    fork: { state: "upcoming", available: false },
    limbo: {
      state: "limbo",
      treatment: "cooling",
      pattern_channel: "cooling-lines",
      window_fraction_remaining: 0.25,
      copy,
    },
    window: {
      set: true,
      closes_at: "2026-11-04T18:00:00.000000Z",
      seconds: 172800,
      available: true,
      unavailable_reason: null,
    },
    decline_available: role === "recipient",
    fork_available: false,
  };
}

function planWith(etiquette: PlanEtiquetteContract | null): OpalPlanContract {
  return {
    id: "plan-i2",
    title: "Dinner at Juniper",
    status: "tentative",
    time_label: "Saturday at 7:30 PM",
    location: "Juniper & Ivy",
    etiquette,
  };
}

const SENDER_COPY =
  "Waiting to hear back about Dinner at Juniper. We will share the answer as soon as it arrives.";
const RECIPIENT_COPY =
  "Your answer window for Dinner at Juniper is still open. A yes or a no is plenty - either answer is a kind one.";

describe("I2 shellData - the card model carries limbo from the contract", () => {
  it("sender view: limbo mapped with the sender's copy and cooling facts", () => {
    const card = cardFromPlan(planWith(etiquetteFor("requester", SENDER_COPY)));
    expect(card.limbo).toEqual({
      state: "limbo",
      treatment: "cooling",
      patternChannel: "cooling-lines",
      windowFractionRemaining: 0.25,
      copy: SENDER_COPY,
      viewerRole: "requester",
    });
  });

  it("recipient view: same state, the recipient's own copy", () => {
    const card = cardFromPlan(planWith(etiquetteFor("recipient", RECIPIENT_COPY)));
    expect(card.limbo?.viewerRole).toBe("recipient");
    expect(card.limbo?.copy).toBe(RECIPIENT_COPY);
    expect(card.limbo?.copy).not.toBe(SENDER_COPY);
    expect(card.limbo?.state).toBe("limbo");
  });

  it("no etiquette fact, or limbo not in limbo, maps to no treatment", () => {
    expect(cardFromPlan(planWith(null)).limbo).toBeNull();
    const awaiting = etiquetteFor("recipient", RECIPIENT_COPY);
    awaiting.limbo = null;
    awaiting.stage = "awaiting";
    expect(limboFromPlan(planWith(awaiting))).toBeNull();
  });
});

describe("I2 ResponseWindowControl - present only where the machinery supports it", () => {
  const available: PlanEtiquetteContract = {
    ...etiquetteFor("requester", SENDER_COPY),
    stage: "awaiting",
    limbo: null,
    window: { set: false, closes_at: null, seconds: null, available: true, unavailable_reason: null },
  };

  it("the requester sees the plain-words control", async () => {
    const container = await render(
      <ResponseWindowControl planId="plan-i2" etiquette={available} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='response-window']")).not.toBeNull();
    expect(container.textContent).toContain("Ask for an answer by");
    expect(container.querySelector("[data-testid='response-window-select']")).not.toBeNull();
  });

  it("the recipient never sees the creator's control", async () => {
    const recipient: PlanEtiquetteContract = { ...available, viewer_role: "recipient" };
    const container = await render(
      <ResponseWindowControl planId="plan-i2" etiquette={recipient} bearer="tok" />,
    );
    expect(container.querySelector("[data-testid='response-window']")).toBeNull();
  });

  it("an unavailable window renders the machinery's own line, not a control", async () => {
    const unavailable: PlanEtiquetteContract = {
      ...available,
      window: {
        set: false,
        closes_at: null,
        seconds: null,
        available: false,
        unavailable_reason: "Response windows are only for people in your circles.",
      },
    };
    const container = await render(
      <ResponseWindowControl planId="plan-i2" etiquette={unavailable} bearer="tok" />,
    );
    expect(
      container.querySelector("[data-testid='response-window-unavailable']")?.textContent,
    ).toBe("Response windows are only for people in your circles.");
    expect(container.querySelector("[data-testid='response-window-select']")).toBeNull();
  });

  it("a set window reads back as a finished line", async () => {
    const container = await render(
      <ResponseWindowControl
        planId="plan-i2"
        etiquette={etiquetteFor("requester", SENDER_COPY)}
        bearer="tok"
      />,
    );
    const line = container.querySelector("[data-testid='response-window-set-line']");
    expect(line?.textContent).toContain("You asked for an answer by");
    expect(container.querySelector("[data-testid='response-window-select']")).toBeNull();
  });

  it("setting calls the real endpoint shape and re-renders from the returned plan", async () => {
    const returnedPlan = {
      ...planWith(null),
      etiquette: etiquetteFor("requester", SENDER_COPY),
    };
    setWindowMock.mockResolvedValue({ ok: true, plan: returnedPlan });
    const onUpdated = vi.fn();
    const container = await render(
      <ResponseWindowControl
        planId="plan-i2"
        etiquette={available}
        bearer="tok"
        onUpdated={onUpdated}
      />,
    );
    const button = container.querySelector(
      "[data-testid='response-window-set']",
    ) as HTMLButtonElement;
    await act(async () => {
      button.click();
    });
    expect(setWindowMock).toHaveBeenCalledWith("plan-i2", "user-sam", 48 * 3600, "tok");
    expect(onUpdated).toHaveBeenCalledWith(returnedPlan);
    expect(
      container.querySelector("[data-testid='response-window-set-line']")?.textContent,
    ).toContain("You asked for an answer by");
  });

  it("a gate refusal surfaces as the server's plain line, never a silent drop", async () => {
    const refusal = new Error("Request failed") as Error & { serverMessage?: string };
    refusal.serverMessage = "Response windows are only for people in your circles.";
    setWindowMock.mockRejectedValue(refusal);
    const container = await render(
      <ResponseWindowControl planId="plan-i2" etiquette={available} bearer="tok" />,
    );
    const button = container.querySelector(
      "[data-testid='response-window-set']",
    ) as HTMLButtonElement;
    await act(async () => {
      button.click();
    });
    expect(
      container.querySelector("[data-testid='response-window-error']")?.textContent,
    ).toBe("Response windows are only for people in your circles.");
    // The control stays - the refusal is a line, not a disappearance.
    expect(container.querySelector("[data-testid='response-window-select']")).not.toBeNull();
  });
});
