/**
 * @vitest-environment jsdom
 *
 * Repair #18 (B2) — copy audit + projection rendering for the at-home
 * food step panel. The panel renders ONLY the backend completion
 * projection; banned provider-claim strings must never appear in its
 * output, and the rollup is rendered from contract data (singular form
 * for solo, attributed counts for groups).
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("../api/productClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    foodAddItems: vi.fn(async () => ({ food_step: {} })),
    foodStartHandoff: vi.fn(async () => ({
      ordered: false,
      provider_confirmed: false,
      handoff_url: "https://example-restaurant.test/",
    })),
    foodSelfConfirm: vi.fn(async () => ({ food_step: {} })),
    foodNotOrdering: vi.fn(async () => ({ food_step: {} })),
    foodCouldNotDeliver: vi.fn(async () => ({ food_step: {} })),
  };
});

import { FoodStepPanel } from "./FoodStepPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BANNED = [
  "order placed",
  "order confirmed",
  "confirmed order",
  "on its way",
  "out for delivery",
  "we ordered",
  "opal ordered",
];

async function renderPanel(props: React.ComponentProps<typeof FoodStepPanel>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<FoodStepPanel {...props} />);
  });
  return {
    host,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      host.remove();
    },
  };
}

const groupCompletion = {
  steps: [
    { id: "join", status: "link_ready", host: "zoom.us" },
    {
      id: "food",
      status: "handed_off",
      restaurant_name: "Juniper and Ivy",
      rollup: {
        households_total: 3,
        households_confirmed: 1,
        confirmed_by: ["Maya"],
        label: "1 of 3 households confirmed their own orders · 2 of 3 households still to order",
      },
      recipients: [
        {
          user_id: "me",
          items: ["margherita pizza"],
          items_state: "ready",
          handoff_state: "handed_off",
        },
        {
          user_id: "maya",
          items: [],
          items_state: "none",
          handoff_state: "self_confirmed_done",
        },
      ],
    },
  ],
};

describe("FoodStepPanel (B2)", () => {
  it("renders join + rollup from the projection with attributed copy and no banned strings", async () => {
    const { host, unmount } = await renderPanel({
      planId: "plan-1",
      completion: groupCompletion,
      viewerUserId: "me",
      meetingLink: "https://zoom.us/j/1",
    });
    const text = host.textContent || "";
    expect(text).toContain("Join on zoom.us");
    expect(text).toContain("1 of 3 households confirmed their own orders");
    expect(text).toContain("confirmed by Maya");
    expect(text).toContain("I placed my order");
    expect(text).toContain("Opal does not place this order");
    for (const banned of BANNED) {
      expect(text.toLowerCase()).not.toContain(banned);
    }
    await unmount();
  });

  it("link_missing renders the add-link copy and no URL", async () => {
    const { host, unmount } = await renderPanel({
      planId: "plan-2",
      completion: { steps: [{ id: "join", status: "link_missing", copy: "x" }] },
      viewerUserId: "me",
    });
    const text = host.textContent || "";
    expect(text).toContain("Add the meeting link");
    expect(host.querySelector("a")).toBeNull();
    await unmount();
  });

  it("solo rollup uses the singular honest form", async () => {
    const { host, unmount } = await renderPanel({
      planId: "plan-3",
      completion: {
        steps: [
          {
            id: "food",
            status: "composed",
            restaurant_name: "Sushi Place",
            rollup: {
              households_total: 1,
              households_confirmed: 0,
              confirmed_by: [],
              label: "Your order list is ready - you place the order with the provider",
            },
            recipients: [
              { user_id: "me", items: [], items_state: "none", handoff_state: "not_started" },
            ],
          },
        ],
      },
      viewerUserId: "me",
    });
    const text = host.textContent || "";
    expect(text).toContain("Your order list is ready - you place the order with the provider");
    expect(text.toLowerCase()).not.toContain("households");
    await unmount();
  });

  it("physical plan (no completion steps) renders nothing", async () => {
    const { host, unmount } = await renderPanel({
      planId: "plan-4",
      completion: { steps: [{ id: "ride", status: "suggested" }] },
      viewerUserId: "me",
    });
    expect(host.querySelector('[data-testid="food-step-panel"]')).toBeNull();
    await unmount();
  });

  it("source audit: B2 web files contain no banned claim strings", () => {
    for (const file of ["opalUi/FoodStepPanel.tsx", "api/productClient.ts"]) {
      const src = readFileSync(resolve(__dirname, "..", file), "utf8").toLowerCase();
      // The self-report control label is the person's own words, allowed:
      const scrubbed = src.replaceAll("i placed my order", "");
      for (const banned of BANNED) {
        expect(scrubbed).not.toContain(banned);
      }
    }
  });
});
