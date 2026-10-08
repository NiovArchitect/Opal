/**
 * ReminderCard + lifecycle projection — all four lifecycle states.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderCard } from "./ReminderCard";
import {
  buildReminderHeadline,
  inferLifecycle,
  mergeReminderFeed,
  planSomethingPrefill,
  projectReminder,
  REMINDER_MOCK_SEED,
  type ReminderProjection,
} from "./reminderLifecycle";
import type { AttentionCenterItem } from "../../api/productClient";

const postOpalMessage = vi.fn(async () => ({ messages: [] }));
const resolveAttentionItem = vi.fn(async () => ({
  actionable_count: 0,
  needs_you: [],
  waiting: [],
  updated: [],
}));

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    postOpalMessage: (...args: unknown[]) => postOpalMessage(...(args as [never])),
    resolveAttentionItem: (...args: unknown[]) =>
      resolveAttentionItem(...(args as [never])),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  postOpalMessage.mockClear();
  resolveAttentionItem.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function baseItem(
  overrides: Partial<AttentionCenterItem> & Record<string, unknown>,
): AttentionCenterItem {
  return {
    id: "att-1",
    dedupe_key: "d1",
    section: "needs_you",
    title: "Maya's birthday is Saturday",
    detail: "3 days away",
    action_required: true,
    source_type: "celebration",
    ...overrides,
  };
}

describe("reminderLifecycle", () => {
  it("covers upcoming, day_of, passed_unplanned, planned", () => {
    expect(inferLifecycle(3, "none")).toBe("upcoming");
    expect(inferLifecycle(0, "none")).toBe("day_of");
    expect(inferLifecycle(-2, "none")).toBe("passed_unplanned");
    expect(inferLifecycle(3, "planned")).toBe("planned");
  });

  it("builds specific headlines", () => {
    expect(buildReminderHeadline("Maya", "birthday", 3, "2026-06-14")).toMatch(
      /Maya's birthday is /,
    );
    expect(buildReminderHeadline("Sam", "anniversary", 0, null)).toBe(
      "Sam's anniversary is today",
    );
    expect(buildReminderHeadline("Alex", "birthday", -7, null)).toBe(
      "Alex's birthday was last week",
    );
  });

  it("projects enrichment fields without reordering", () => {
    const items = [
      baseItem({
        id: "a",
        lifecycle: "upcoming",
        person_name: "Maya",
        days_until: 3,
        plan_status: "none",
      }),
      baseItem({
        id: "b",
        title: "Sam's anniversary is today",
        source_type: "temporal_anchor",
        lifecycle: "day_of",
        person_name: "Sam",
        days_until: 0,
      }),
    ];
    const rows = mergeReminderFeed(items, { includeMockWhenEmpty: false });
    expect(rows.map((r) => r.reminder.attentionId)).toEqual(["a", "b"]);
    expect(rows[0].reminder.lifecycle).toBe("upcoming");
    expect(rows[1].reminder.lifecycle).toBe("day_of");
  });

  it("ignores non-reminder source types", () => {
    expect(
      projectReminder(baseItem({ source_type: "proposal" })),
    ).toBeNull();
  });

  it("seeds mock lifecycles when feed empty", () => {
    const rows = mergeReminderFeed([], { forceSeed: true });
    const lifecycles = rows.map((r) => r.reminder.lifecycle);
    expect(lifecycles).toEqual([
      "upcoming",
      "day_of",
      "passed_unplanned",
      "planned",
    ]);
    expect(REMINDER_MOCK_SEED).toHaveLength(4);
  });

  it("prefills Plan something with person + date", () => {
    const r: ReminderProjection = REMINDER_MOCK_SEED[0];
    expect(planSomethingPrefill(r)).toContain("Maya");
    expect(planSomethingPrefill(r)).toContain("birthday");
    expect(planSomethingPrefill(r)).toContain("2026-06-14");
  });
});

describe("ReminderCard", () => {
  it.each(REMINDER_MOCK_SEED)(
    "renders lifecycle $lifecycle for $personName",
    async (reminder) => {
      await act(async () => {
        root.render(<ReminderCard reminder={reminder} bearer="tok" />);
      });
      const card = container.querySelector(
        `[data-testid="reminder-card-${reminder.attentionId}"]`,
      );
      expect(card).toBeTruthy();
      expect(card?.getAttribute("data-reminder-lifecycle")).toBe(
        reminder.lifecycle,
      );
      expect(
        container.querySelector(
          `[data-testid="reminder-headline-${reminder.attentionId}"]`,
        )?.textContent,
      ).toBe(reminder.headline);
    },
  );

  it("Plan something posts prefilled Center message", async () => {
    const reminder = REMINDER_MOCK_SEED[0];
    await act(async () => {
      root.render(<ReminderCard reminder={reminder} bearer="tok" />);
    });
    const btn = container.querySelector(
      `[data-testid="reminder-plan-${reminder.attentionId}"]`,
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
      await Promise.resolve();
    });
    expect(postOpalMessage).toHaveBeenCalled();
    const body = postOpalMessage.mock.calls[0][0] as string;
    expect(body).toContain("Maya");
    expect(body).toContain("birthday");
  });

  it("Dismiss resolves attention item", async () => {
    const reminder: ReminderProjection = {
      ...REMINDER_MOCK_SEED[0],
      attentionId: "real-att-1",
    };
    const onDismissed = vi.fn();
    await act(async () => {
      root.render(
        <ReminderCard
          reminder={reminder}
          bearer="tok"
          onDismissed={onDismissed}
        />,
      );
    });
    const btn = container.querySelector(
      `[data-testid="reminder-dismiss-${reminder.attentionId}"]`,
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
      await Promise.resolve();
    });
    expect(resolveAttentionItem).toHaveBeenCalledWith("real-att-1", "tok");
    expect(onDismissed).toHaveBeenCalled();
  });
});
