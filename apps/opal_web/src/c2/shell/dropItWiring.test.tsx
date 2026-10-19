/**
 * @vitest-environment jsdom
 *
 * Repair #18 - "Drop it" (plan cancel) wiring acceptance:
 *  (a) droppable derivation - a card renders Drop it only when the
 *      plans contract proves BOTH facts the cancel route checks:
 *      the viewer's lead authority (the can_edit stamp, from the same
 *      plan_lead?/2 cancel_plan enforces) and a status the
 *      PlanTransition :cancel gate accepts (tentative/agreed/changed);
 *  (b) the confirm issues the real cancel call with the plan id and
 *      the session bearer;
 *  (c) success reads back from the server - the plans list is
 *      re-fetched and the cancelled plan leaves the surface because
 *      the server's list excludes it, not because it was hidden
 *      locally;
 *  (d) failure surfaces the one plain-language error line in the
 *      sheet, the sheet stays open, and the card is NOT hidden.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listOpalPlans = vi.fn();
const cancelOpalPlan = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
    cancelOpalPlan: (...a: unknown[]) => cancelOpalPlan(...a),
  };
});

import { C2Shell } from "./C2Shell";
import { graphListFromPlans, planDroppable } from "./shellData";
import { saveProfile, type OpalPlanContract } from "../../api/productClient";

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
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

function q(sel: string) {
  return document.querySelector(sel);
}
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const plan = (over: Partial<OpalPlanContract>): OpalPlanContract => ({
  id: "p",
  title: "Plan",
  status: "tentative",
  location: "The Henry",
  time_label: "Sunday 10 AM",
  ...over,
});

describe("droppable derivation (planDroppable)", () => {
  it("is true exactly for gate-legal statuses with lead authority", () => {
    for (const status of ["tentative", "agreed", "changed"]) {
      expect(planDroppable(plan({ status, can_edit: true }))).toBe(true);
    }
  });

  it("is false without the can_edit authority stamp", () => {
    expect(planDroppable(plan({ status: "tentative", can_edit: false }))).toBe(false);
    expect(planDroppable(plan({ status: "agreed", can_edit: undefined }))).toBe(false);
  });

  it("is false for statuses the cancel gate refuses, even for the lead", () => {
    for (const status of ["cancelled", "completed", "expired", "ready", ""]) {
      expect(planDroppable(plan({ status, can_edit: true }))).toBe(false);
    }
  });

  it("graphListFromPlans carries the derivation onto each card", () => {
    const list = graphListFromPlans([
      plan({ id: "lead-tentative", status: "tentative", can_edit: true }),
      plan({ id: "guest-tentative", status: "tentative", can_edit: false }),
      plan({ id: "lead-completed", status: "completed", can_edit: true }),
    ]);
    const byId = new Map<string, boolean | undefined>();
    for (const group of list.groups) {
      for (const card of group.cards) byId.set(card.id, card.droppable);
    }
    expect(byId.get("lead-tentative")).toBe(true);
    expect(byId.get("guest-tentative")).toBe(false);
    expect(byId.get("lead-completed")).toBe(false);
  });
});

const DROP_PLAN: OpalPlanContract = plan({
  id: "plan-drop-1",
  title: "Dinner at The Henry",
  status: "tentative",
  can_edit: true,
});
const KEEP_PLAN: OpalPlanContract = plan({
  id: "plan-keep-1",
  title: "Trail walk",
  status: "agreed",
  can_edit: false,
  location: "Batiquitos Lagoon",
  time_label: "Saturday 9 AM",
});

let serverPlans: OpalPlanContract[] = [];

async function renderMemberGraphs() {
  saveProfile({
    access_token: "tok-drop",
    user_id: "user-1",
    display_name: "Sadeil Lewis",
    handle: "sadeil",
    session_id: "sess-1",
  });
  await render(<C2Shell />);
  await flush();
  click(q('[data-testid="c2-dock-graphs"]')!);
  await flush();
  await flush();
  expect(q('[data-testid="c2-graphs"]')).toBeTruthy();
}

beforeEach(() => {
  serverPlans = [DROP_PLAN, KEEP_PLAN];
  listOpalPlans.mockImplementation(async () => ({ plans: serverPlans }));
  cancelOpalPlan.mockImplementation(async (id: string) => {
    // The server's truth after a cancel: the row is cancelled and the
    // default plans list no longer returns it.
    serverPlans = serverPlans.filter((p) => p.id !== id);
    return { ok: true, plan: { ...DROP_PLAN, id, status: "cancelled" } };
  });
});

describe("C2 shell - Drop it end to end", () => {
  it("renders Drop it only on the droppable card", async () => {
    await renderMemberGraphs();
    expect(document.querySelectorAll('[data-testid="c2-graph-drop"]')).toHaveLength(1);
    expect(document.body.textContent).toContain("Dinner at The Henry");
    expect(document.body.textContent).toContain("Trail walk");
  });

  it("confirm cancels through the API and the card leaves by server read-back", async () => {
    await renderMemberGraphs();
    const listCallsBefore = listOpalPlans.mock.calls.length;
    click(q('[data-testid="c2-graph-drop"]')!);
    expect(q('[data-testid="c2-graphs-drop-sheet"]')).toBeTruthy();
    click(q('[data-testid="c2-graph-drop-confirm"]')!);
    await flush();
    await flush();
    expect(cancelOpalPlan).toHaveBeenCalledTimes(1);
    expect(cancelOpalPlan).toHaveBeenCalledWith("plan-drop-1", "tok-drop");
    // Read-back: the list was re-fetched after the cancel...
    expect(listOpalPlans.mock.calls.length).toBeGreaterThan(listCallsBefore);
    // ...and the cancelled plan is gone because the server's list
    // excludes it; the untouched plan stays; the sheet closed.
    expect(document.body.textContent).not.toContain("Dinner at The Henry");
    expect(document.body.textContent).toContain("Trail walk");
    expect(q('[data-testid="c2-graphs-drop-sheet"]')).toBeNull();
  });

  it("failure shows the plain error in the sheet and does not hide the card", async () => {
    cancelOpalPlan.mockRejectedValue(
      Object.assign(new Error("Only the plan's lead can cancel it."), {
        code: "not_authorized",
        serverMessage: "Only the plan's lead can cancel it.",
      }),
    );
    await renderMemberGraphs();
    const listCallsBefore = listOpalPlans.mock.calls.length;
    click(q('[data-testid="c2-graph-drop"]')!);
    click(q('[data-testid="c2-graph-drop-confirm"]')!);
    await flush();
    await flush();
    expect(cancelOpalPlan).toHaveBeenCalledTimes(1);
    const error = q('[data-testid="c2-graph-drop-error"]');
    expect(error).toBeTruthy();
    expect(error!.textContent).toBe(
      "Only the plan's lead can drop this plan. Ask them to drop it, or keep it for now.",
    );
    // No read-back was faked and nothing was hidden locally.
    expect(listOpalPlans.mock.calls.length).toBe(listCallsBefore);
    expect(document.body.textContent).toContain("Dinner at The Henry");
    expect(q('[data-testid="c2-graphs-drop-sheet"]')).toBeTruthy();
  });

  it("Keep it closes the one ask without cancelling", async () => {
    await renderMemberGraphs();
    click(q('[data-testid="c2-graph-drop"]')!);
    const keep = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Keep it",
    );
    click(keep!);
    await flush();
    expect(cancelOpalPlan).not.toHaveBeenCalled();
    expect(q('[data-testid="c2-graphs-drop-sheet"]')).toBeNull();
    expect(document.body.textContent).toContain("Dinner at The Henry");
  });
});
