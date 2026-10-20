/**
 * @vitest-environment jsdom
 *
 * Repair #20 (F-20) - connector execution points: the food spine
 * task's composed handoff must hand off INTO the viewer's own
 * connected tool. The backend's one handoff transport
 * (FoodHandoff.provider_choices) supports the viewer's own delivery
 * apps as a provider search rail; this pin proves the panel offers
 * exactly those choices, starts the handoff with the chosen
 * provider_choice, and opens the returned provider URL - and that
 * no provider rail is offered before a restaurant is chosen (the
 * rail carries the restaurant name; without one there is no rail).
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const foodStartHandoffMock = vi.fn(async () => ({
  ordered: false,
  provider_confirmed: false,
  handoff_url: "https://www.doordash.com/search/store/Juniper%20and%20Ivy",
}));

vi.mock("../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    foodAddItems: vi.fn(async () => ({ food_step: {} })),
    foodStartHandoff: (...args: unknown[]) => foodStartHandoffMock(...args),
    foodSelfConfirm: vi.fn(async () => ({ food_step: {} })),
    foodNotOrdering: vi.fn(async () => ({ food_step: {} })),
    foodCouldNotDeliver: vi.fn(async () => ({ food_step: {} })),
  };
});

import { FoodStepPanel } from "./FoodStepPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  foodStartHandoffMock.mockClear();
  vi.restoreAllMocks();
});

async function renderPanel(completion: unknown) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <FoodStepPanel
        planId="plan-f20"
        completion={completion as never}
        viewerUserId="me"
      />,
    );
  });
  return host;
}

const completionWithRestaurant = {
  steps: [
    {
      id: "food",
      status: "composing",
      restaurant_name: "Juniper and Ivy",
      recipients: [
        { user_id: "me", items: [], items_state: "none", handoff_state: "not_started" },
      ],
    },
  ],
};

describe("F-20 - food handoff routes into the viewer's own app", () => {
  it("offers exactly the backend's provider choices and starts the handoff with the pick", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const host = await renderPanel(completionWithRestaurant);
    const keys = [...host.querySelectorAll('[data-testid^="food-provider-"]')].map((el) =>
      el.getAttribute("data-testid"),
    );
    expect(keys).toEqual([
      "food-provider-doordash",
      "food-provider-ubereats",
      "food-provider-grubhub",
    ]);
    const uber = host.querySelector<HTMLButtonElement>(
      '[data-testid="food-provider-ubereats"]',
    );
    expect(uber?.textContent).toContain("Uber Eats");
    await act(async () => {
      uber!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(foodStartHandoffMock).toHaveBeenCalledTimes(1);
    expect(foodStartHandoffMock.mock.calls[0][0]).toBe("plan-f20");
    expect(foodStartHandoffMock.mock.calls[0][1]).toBe("ubereats");
    // The handoff opens the provider's own URL - into the tool.
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.doordash.com/search/store/Juniper%20and%20Ivy",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("no restaurant chosen yet: no provider rail is offered (nothing to search for)", async () => {
    const host = await renderPanel({
      steps: [
        {
          id: "food",
          status: "composing",
          restaurant_name: null,
          recipients: [
            { user_id: "me", items: [], items_state: "none", handoff_state: "not_started" },
          ],
        },
      ],
    });
    expect(host.querySelector('[data-testid="food-providers"]')).toBeNull();
  });
});
