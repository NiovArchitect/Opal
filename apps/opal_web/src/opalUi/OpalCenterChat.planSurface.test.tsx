/**
 * @vitest-environment jsdom
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/productClient", () => ({
  getOpalConversation: vi.fn(async () => ({
    conversation: { id: "oc-1", user_id: "u1", messages: [] },
  })),
  postOpalMessage: vi.fn(async (body: string) => ({
    messages: [
      {
        id: `u-${Date.now()}`,
        conversation_id: "oc-1",
        role: "user",
        body,
        metadata: null,
        inserted_at: new Date().toISOString(),
      },
      {
        id: `o-${Date.now()}`,
        conversation_id: "oc-1",
        role: "opal",
        body:
          body.toLowerCase() === "yes"
            ? "Anytime — what's on your mind?"
            : "I can help with dinner plans. Want me to set this up?",
        metadata: { intent: { intent: "chat", entities: {} } },
        inserted_at: new Date().toISOString(),
      },
    ],
  })),
}));

vi.mock("./founderGraphSeed", async () => {
  const actual = await vi.importActual<typeof import("./founderGraphSeed")>("./founderGraphSeed");
  return {
    ...actual,
    isFounderSeedEnabled: () => true,
  };
});

import { OpalCenterChat } from "./OpalCenterChat";

describe("OpalCenterChat plan surface", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    sessionStorage.clear();
  });

  afterEach(() => {
    host.remove();
  });

  it("Yes after plan ask emits onPlanCreated on founder seed", async () => {
    const onPlanCreated = vi.fn();
    await act(async () => {
      createRoot(host).render(
        <OpalCenterChat onBack={() => {}} onPlanCreated={onPlanCreated} />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const input = host.querySelector(
      '[data-testid="opal-center-chat-input"]',
    ) as HTMLTextAreaElement;
    const send = host.querySelector(
      '[data-testid="opal-center-chat-send"]',
    ) as HTMLButtonElement;
    expect(input).toBeTruthy();

    await act(async () => {
      const native = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      native?.call(input, "Plan dinner with Maya Friday");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      send.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      const native = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      native?.call(input, "Yes");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      send.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });

    expect(onPlanCreated).toHaveBeenCalled();
    const plan = onPlanCreated.mock.calls[0]?.[0];
    expect(plan?.who).toBe("Maya");
    expect(plan?.title).toMatch(/Dinner with Maya/i);
  });
});
