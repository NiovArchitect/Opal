/**
 * @vitest-environment jsdom
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Repair #17 contract: Center plans surface ONLY from backend plan
 * metadata (plan_confirm). The old behavior — with the founder seed flag
 * on, a local plan was fabricated when the user said "Yes" after a plan
 * ask (and a fake "Done … is on your Graph" reply painted on send
 * failure) — is deleted. The mocked client boundary below proves both
 * halves: generic backend replies fabricate NOTHING, and a real
 * plan_confirm metadata reply still surfaces the plan.
 */
vi.mock("../api/productClient", () => ({
  getOpalConversation: vi.fn(async () => ({
    conversation: { id: "oc-1", user_id: "u1", messages: [] },
  })),
  postOpalMessage: vi.fn(async (body: string) => {
    const isYes = body.toLowerCase() === "yes";
    return {
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
          body: isYes
            ? "Anytime - what's on your mind?"
            : "I can help with dinner plans. Want me to set this up?",
          // Generic chat metadata — deliberately NO plan_confirm.
          metadata: { intent: { intent: "chat", entities: {} } },
          inserted_at: new Date().toISOString(),
        },
      ],
    };
  }),
}));

import { OpalCenterChat } from "./OpalCenterChat";
import { postOpalMessage } from "../api/productClient";

async function sendText(host: HTMLDivElement, text: string) {
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
    native?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    send.click();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 80));
  });
}

describe("OpalCenterChat plan surface", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    sessionStorage.clear();
    vi.mocked(postOpalMessage).mockClear();
  });

  afterEach(() => {
    host.remove();
  });

  it("Yes after plan ask fabricates NO plan when the backend sent no plan metadata", async () => {
    const onPlanCreated = vi.fn();
    await act(async () => {
      createRoot(host).render(
        <OpalCenterChat onBack={() => {}} onPlanCreated={onPlanCreated} />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    await sendText(host, "Plan dinner with Maya Friday");
    await sendText(host, "Yes");

    // The sends DID traverse the real client boundary…
    expect(vi.mocked(postOpalMessage)).toHaveBeenCalledTimes(2);
    // …but no local plan was synthesized from the user's "Yes".
    expect(onPlanCreated).not.toHaveBeenCalled();
    expect(host.textContent).not.toMatch(/is on your Graph/i);
  });

  it("a backend plan_confirm metadata reply still surfaces the plan", async () => {
    vi.mocked(postOpalMessage).mockImplementation(async (body: string) => {
      const isYes = body.toLowerCase() === "yes";
      return {
        messages: [
          {
            id: `u-${Date.now()}`,
            conversation_id: "oc-1",
            role: "user" as const,
            body,
            metadata: null,
            inserted_at: new Date().toISOString(),
          },
          {
            id: `o-${Date.now()}`,
            conversation_id: "oc-1",
            role: "opal" as const,
            body: isYes ? "Done - dinner is set." : "Want me to set this up?",
            metadata: isYes
              ? {
                  intent: {
                    intent: "plan_confirm",
                    entities: {
                      confirmed: true,
                      plan_id: "plan-backend-1",
                      title: "Dinner with Maya",
                      who: ["Maya"],
                      when: "Friday",
                      what: "dinner",
                    },
                  },
                }
              : { intent: { intent: "chat", entities: {} } },
            inserted_at: new Date().toISOString(),
          },
        ],
      } as never;
    });

    const onPlanCreated = vi.fn();
    await act(async () => {
      createRoot(host).render(
        <OpalCenterChat onBack={() => {}} onPlanCreated={onPlanCreated} />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    await sendText(host, "Plan dinner with Maya Friday");
    await sendText(host, "Yes");

    expect(onPlanCreated).toHaveBeenCalledTimes(1);
    const plan = onPlanCreated.mock.calls[0]?.[0];
    expect(plan?.id).toBe("plan-backend-1");
    expect(plan?.who).toBe("Maya");
  });
});
