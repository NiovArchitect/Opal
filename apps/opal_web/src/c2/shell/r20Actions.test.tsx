/**
 * Repair #20 (C6 actions) - web pins.
 *
 * F-13 SPINE INTERACTIVITY: every preparation-spine item the
 * projection stamps with a real action surface renders as a tap
 * target that opens exactly that surface; items with no real
 * surface (Opal-owned machinery, other people's answers) stay
 * static. The plan-chat action folds in ONLY when the detail's Who
 * rows prove another participant exists to scope the doorway to.
 *
 * F-15 REPEAT A PLAN: the "Do that again" affordance renders on
 * settled/past plans only, inside the detail overflow menu; the
 * repeat flow carries parties + place through the durable
 * graph-create path with source_plan_id provenance, and the new
 * time is chosen in the flow - never copied from the settled plan.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createGraphPlanMock = vi.fn();
vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createGraphPlan: (...args: unknown[]) => createGraphPlanMock(...args),
  };
});

import { C2GraphDetail, type C2GraphsEvents } from "./C2Graphs";
import { RepeatPlanFlow } from "./C2Shell";
import { detailFromPlan, detailWithHistory } from "./shellData";
import { foldSpineChatActions, spineFromPlan, type SpineItem } from "./density";
import type { OpalPlanContract, PlanHistoryContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  createGraphPlanMock.mockReset();
  createGraphPlanMock.mockResolvedValue({
    plan: { id: "new-plan-1", title: "Dinner, again", status: "tentative" },
    participants: [],
    deduplicated: false,
  });
  // jsdom has no scrollIntoView; the in-detail spine actions scroll
  // to the section that renders the surface.
  (window.HTMLElement.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
    () => {};
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container?.remove();
  container = null;
});

const VIEWER = "viewer-1";
const OTHER = "other-1";

const DINNER: OpalPlanContract = {
  id: "plan-dinner",
  title: "Dinner at Juniper",
  status: "tentative",
  location: "Juniper & Ivy",
  plan_type: "in_person",
  time_label: "Sat 7pm",
  conversation_id: "conv-1",
  place_lat: 32.72,
  place_lon: -117.16,
  completion: {
    driven_at: "2026-10-18T00:00:00Z",
    steps: [
      { id: "calendar", status: "projected" },
      { id: "restaurants", status: "running" },
      { id: "food", status: "collecting" },
      { id: "ride", status: "offer" },
      { id: "follow_through", status: "registered" },
    ],
  },
};

const historyWith = (who: PlanHistoryContract["who"]): PlanHistoryContract => ({
  plan_id: DINNER.id,
  history: [],
  who,
  counts: { going_count: who.length, total_count: who.length },
});

const WHO_BOTH: PlanHistoryContract["who"] = [
  { user_id: VIEWER, name: "You", role: "creator", response_state: "accepted", response_label: "Going" },
  { user_id: OTHER, name: "Maya", role: "participant", response_state: "accepted", response_label: "Going" },
];

const baseEvents: C2GraphsEvents = {
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

function spineItem(detail: { spine?: SpineItem[] }, id: string): SpineItem {
  const item = detail.spine?.find((i) => i.id === id);
  if (!item) throw new Error(`no spine item ${id}`);
  return item;
}

function renderedSpineItem(id: string): Element | null {
  return (
    [...document.body.querySelectorAll('[data-testid="c2-spine-item"]')].find(
      (el) => el.textContent?.includes(id === "step-ride" ? "Arrange a ride" : id),
    ) ?? null
  );
}

describe("F-13 - spine action mapping (the projection's table)", () => {
  it("in-detail surfaces are stamped by spineFromPlan; chat surfaces wait for the fold", () => {
    const spine = spineFromPlan({ plan: DINNER });
    expect(spineItem({ spine }, "step-food").action).toEqual({ kind: "food-panel" });
    expect(spineItem({ spine }, "step-restaurants").action).toBeNull();
    expect(spineItem({ spine }, "step-ride").action).toBeNull();
    // Opal-owned machinery has NO user action surface - declared absent.
    expect(spineItem({ spine }, "step-calendar").action).toBeNull();
    expect(spineItem({ spine }, "step-follow_through").action).toBeNull();
    expect(spineItem({ spine }, "intent").action ?? null).toBeNull();
    expect(spineItem({ spine }, "event").action ?? null).toBeNull();
  });

  it("foldSpineChatActions stamps plan-chat only when a scope person exists", () => {
    const spine = spineFromPlan({ plan: DINNER });
    const foldedOff = foldSpineChatActions(spine, { chatAvailable: false });
    expect(spineItem({ spine: foldedOff }, "step-ride").action).toBeNull();
    const folded = foldSpineChatActions(spine, { chatAvailable: true });
    expect(spineItem({ spine: folded }, "step-ride").action).toEqual({ kind: "plan-chat" });
    expect(spineItem({ spine: folded }, "step-restaurants").action).toEqual({
      kind: "plan-chat",
    });
    // The fold never overwrites an in-detail action.
    expect(spineItem({ spine: folded }, "step-food").action).toEqual({ kind: "food-panel" });
  });

  it("detailWithHistory folds plan-chat from the real Who rows, viewer-only earns none", () => {
    const withOther = detailWithHistory(
      detailFromPlan(DINNER, "graphs", VIEWER),
      historyWith(WHO_BOTH),
    );
    expect(spineItem(withOther, "step-ride").action).toEqual({ kind: "plan-chat" });
    expect(withOther.conversationId).toBe("conv-1");

    const solo = detailWithHistory(
      detailFromPlan(DINNER, "graphs", VIEWER),
      historyWith([WHO_BOTH[0]]),
    );
    expect(spineItem(solo, "step-ride").action).toBeNull();
  });
});

describe("F-13 - spine rendering on graph detail", () => {
  it("action items render as buttons; tapping plan-chat opens the doorway event; machinery stays static", async () => {
    const openSpineTask = vi.fn();
    const detail = detailWithHistory(
      detailFromPlan(DINNER, "graphs", VIEWER),
      historyWith(WHO_BOTH),
    );
    await act(async () => {
      root!.render(
        <C2GraphDetail detail={detail} events={{ ...baseEvents, openSpineTask }} />,
      );
    });
    const items = [...document.body.querySelectorAll('[data-testid="c2-spine-item"]')];
    const byAction = (kind: string) =>
      items.find((el) => el.getAttribute("data-spine-action") === kind);
    const ride = items.find(
      (el) =>
        el.getAttribute("data-spine-action") === "plan-chat" &&
        el.textContent?.includes("Arrange a ride"),
    );
    expect(ride?.tagName).toBe("BUTTON");
    expect(byAction("food-panel")?.tagName).toBe("BUTTON");
    // Calendar (Opal-owned) renders as a static row, never a button.
    const calendar = items.find((el) => el.textContent?.includes("On your calendar"));
    expect(calendar?.tagName).toBe("DIV");
    expect(calendar?.hasAttribute("data-spine-action")).toBe(false);

    await act(async () => {
      (ride as HTMLButtonElement).dispatchEvent(
        new window.MouseEvent("click", { bubbles: true }),
      );
    });
    expect(openSpineTask).toHaveBeenCalledTimes(1);
    const [calledDetail, calledItem] = openSpineTask.mock.calls[0];
    expect(calledDetail.id).toBe(DINNER.id);
    expect(calledItem.id).toBe("step-ride");
    expect(renderedSpineItem("step-ride")).toBeTruthy();
  });

  it("without a wired doorway, plan-chat items render static (fail-closed) but food still opens its panel", async () => {
    const detail = detailWithHistory(
      detailFromPlan(DINNER, "graphs", VIEWER),
      historyWith(WHO_BOTH),
    );
    await act(async () => {
      root!.render(<C2GraphDetail detail={detail} events={baseEvents} />);
    });
    const items = [...document.body.querySelectorAll('[data-testid="c2-spine-item"]')];
    const ride = items.find((el) => el.textContent?.includes("Arrange a ride"));
    expect(ride?.tagName).toBe("DIV");
    const food = items.find((el) => el.getAttribute("data-spine-action") === "food-panel");
    expect(food?.tagName).toBe("BUTTON");
    // The food panel - the real composed-handoff surface - is on this detail.
    expect(document.body.querySelector('[data-testid="c2-detail-food"]')).toBeTruthy();
  });
});

describe("F-15 - repeat projection + affordance", () => {
  const SETTLED: OpalPlanContract = { ...DINNER, id: "plan-settled", status: "completed" };

  it("a settled plan is repeatable and carries place + coordinates; a live plan is not repeatable", () => {
    const settled = detailFromPlan(SETTLED, "graphs", VIEWER);
    expect(settled.repeatable).toBe(true);
    expect(settled.repeat).toMatchObject({
      location: "Juniper & Ivy",
      placeLat: 32.72,
      placeLon: -117.16,
      planType: "in_person",
      participantUserIds: [],
    });
    const live = detailFromPlan(DINNER, "graphs", VIEWER);
    expect(live.repeatable).toBe(false);
  });

  it("detailWithHistory carries the parties (everyone but the viewer)", () => {
    const settled = detailWithHistory(
      detailFromPlan(SETTLED, "graphs", VIEWER),
      historyWith(WHO_BOTH),
    );
    expect(settled.repeat?.participantUserIds).toEqual([OTHER]);
  });

  it("'Do that again' renders in the overflow menu on settled plans only", async () => {
    const repeatPlan = vi.fn();
    const settled = detailWithHistory(
      detailFromPlan(SETTLED, "graphs", VIEWER),
      historyWith(WHO_BOTH),
    );
    await act(async () => {
      root!.render(
        <C2GraphDetail detail={settled} events={{ ...baseEvents, repeatPlan }} />,
      );
    });
    const overflow = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="c2-detail-overflow"]',
    );
    expect(overflow).toBeTruthy();
    await act(async () => {
      overflow!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    const item = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="c2-detail-repeat"]',
    );
    expect(item).toBeTruthy();
    expect(item?.textContent).toContain("Do that again");
    await act(async () => {
      item!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(repeatPlan).toHaveBeenCalledTimes(1);
    expect(repeatPlan.mock.calls[0][0].id).toBe(SETTLED.id);
  });

  it("a live plan renders no repeat affordance and no overflow menu", async () => {
    const detail = detailFromPlan(DINNER, "graphs", VIEWER);
    await act(async () => {
      root!.render(
        <C2GraphDetail detail={detail} events={{ ...baseEvents, repeatPlan: vi.fn() }} />,
      );
    });
    expect(document.body.querySelector('[data-testid="c2-detail-repeat"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="c2-detail-overflow"]')).toBeNull();
  });
});

describe("F-15 - the repeat flow", () => {
  const SETTLED: OpalPlanContract = {
    ...DINNER,
    id: "plan-settled",
    status: "completed",
    time_label: "Last Saturday 7pm",
  };

  async function renderFlow(plan: OpalPlanContract = SETTLED) {
    const detail = detailWithHistory(
      detailFromPlan(plan, "graphs", VIEWER),
      historyWith(WHO_BOTH),
    );
    const onCreated = vi.fn();
    await act(async () => {
      root!.render(<RepeatPlanFlow detail={detail} bearer="tok" onClose={() => {}} onCreated={onCreated} />);
    });
    return { detail, onCreated };
  }

  const setField = async (testId: string, value: string) => {
    const input = document.body.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
    expect(input).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, value);
      input!.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
  };

  it("carries parties + place, requires a NEW time, and creates through graph-create with provenance", async () => {
    const { onCreated } = await renderFlow();
    expect(
      document.body.querySelector('[data-testid="c2-repeat-parties"]')?.textContent,
    ).toContain("Maya");
    const place = document.body.querySelector<HTMLInputElement>(
      '[data-testid="c2-repeat-place"]',
    );
    expect(place?.value).toBe("Juniper & Ivy");
    // No new time chosen yet: submit is disabled (the settled plan's
    // time is never copied silently).
    const submit = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="c2-repeat-submit"]',
    );
    expect(submit?.disabled).toBe(true);
    const when = document.body.querySelector<HTMLInputElement>(
      '[data-testid="c2-repeat-when"]',
    );
    expect(when?.value).toBe("");

    await setField("c2-repeat-when", "Next Saturday - around 7:00 PM");
    expect(submit?.disabled).toBe(false);
    await act(async () => {
      submit!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(createGraphPlanMock).toHaveBeenCalledTimes(1);
    const attrs = createGraphPlanMock.mock.calls[0][0];
    expect(attrs).toMatchObject({
      title: "Dinner at Juniper",
      location: "Juniper & Ivy",
      place_lat: 32.72,
      place_lon: -117.16,
      time_label: "Next Saturday - around 7:00 PM",
      participant_user_ids: [OTHER],
      source_plan_id: "plan-settled",
      entry: "repeat",
    });
    expect(attrs.time_label).not.toBe("Last Saturday 7pm");
    expect(onCreated).toHaveBeenCalledWith("new-plan-1");
  });

  it("editing the place drops the source coordinates (a new place's coordinates are unknown)", async () => {
    await renderFlow();
    await setField("c2-repeat-place", "A different restaurant");
    await setField("c2-repeat-when", "Friday 8pm");
    const submit = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="c2-repeat-submit"]',
    );
    await act(async () => {
      submit!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    const attrs = createGraphPlanMock.mock.calls[0][0];
    expect(attrs.location).toBe("A different restaurant");
    expect(attrs.place_lat).toBeUndefined();
    expect(attrs.place_lon).toBeUndefined();
  });

  it("a virtual source stays virtual and carries no place and no meeting link", async () => {
    await renderFlow({
      ...SETTLED,
      id: "plan-settled-virtual",
      plan_type: "virtual",
      online: true,
      location: "Online",
      meeting_link: "https://meet.example/old",
      place_lat: null,
      place_lon: null,
    } as OpalPlanContract);
    expect(document.body.querySelector('[data-testid="c2-repeat-online"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="c2-repeat-place"]')).toBeNull();
    await setField("c2-repeat-when", "Tomorrow 6pm");
    const submit = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="c2-repeat-submit"]',
    );
    await act(async () => {
      submit!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    const attrs = createGraphPlanMock.mock.calls[0][0];
    expect(attrs.plan_type).toBe("virtual");
    expect(attrs.location).toBeUndefined();
    expect(attrs.meeting_link).toBeUndefined();
    expect(attrs.source_plan_id).toBe("plan-settled-virtual");
  });
});
