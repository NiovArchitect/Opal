/**
 * Repair #18 hunt-fix (web) — C2 Graph Detail: B-13 chat reachability,
 * B-15 conversion control, B-16 virtual Join.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { C2GraphDetail, type C2GraphsEvents } from "./C2Graphs";
import { detailFromPlan } from "./shellData";
import type { OpalPlanContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  convertPlan: async () => "Done — this plan is online now.",
};

const PHYSICAL: OpalPlanContract = {
  id: "plan-phys",
  title: "Dinner",
  status: "agreed",
  location: "Juniper & Ivy",
  plan_type: "in_person",
  time_label: "Sat 7pm",
};

describe("C2 Graph Detail hunt-fix", () => {
  it("B-13: the chat action renders even though nextAction is null", async () => {
    const detail = detailFromPlan(PHYSICAL, "graphs");
    expect(detail.nextAction).toBeNull();
    await act(async () => {
      root!.render(<C2GraphDetail detail={detail} events={events} />);
    });
    expect(document.body.querySelector('[data-testid="c2-detail-open-chat"]')).toBeTruthy();
  });

  it("B-16: a virtual plan shows Join from its own meeting link", async () => {
    const detail = detailFromPlan(
      {
        ...PHYSICAL,
        id: "plan-virt",
        plan_type: "virtual",
        online: true,
        location: null,
        meeting_link: "https://meet.example/abc",
      },
      "graphs",
    );
    await act(async () => {
      root!.render(<C2GraphDetail detail={detail} events={events} />);
    });
    expect(document.body.querySelector('[data-testid="c2-detail-join"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="c2-detail-convert"]')).toBeNull();
  });

  it("B-16: a virtual plan without a link says so honestly — no fake Join", async () => {
    const detail = detailFromPlan(
      { ...PHYSICAL, id: "plan-virt2", plan_type: "virtual", online: true, location: null },
      "graphs",
    );
    await act(async () => {
      root!.render(<C2GraphDetail detail={detail} events={events} />);
    });
    expect(document.body.querySelector('[data-testid="c2-detail-join"]')).toBeNull();
    expect(
      document.body.querySelector('[data-testid="c2-detail-join-missing"]'),
    ).toBeTruthy();
  });

  it("B-15: a physical plan offers Move this online and shows the result line", async () => {
    const detail = detailFromPlan(PHYSICAL, "graphs");
    await act(async () => {
      root!.render(<C2GraphDetail detail={detail} events={events} />);
    });
    const btn = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="c2-detail-convert"]',
    );
    expect(btn).toBeTruthy();
    await act(async () => {
      btn!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(
      document.body.querySelector('[data-testid="c2-detail-convert-note"]')?.textContent,
    ).toContain("online now");
  });
});
