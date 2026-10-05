/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { ChatsHome } from "./ChatsHome";
import {
  FOUNDER_CHATS_PLAN_PILL_ROWS,
  inferPlanPillTone,
} from "./founderChatsPlanPills";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("founder chats plan pills (screenshot A)", () => {
  it("infers dinner / activity / trip / live tones", () => {
    expect(inferPlanPillTone("Juniper & Ivy · 7:30 PM")).toBe("dinner");
    expect(inferPlanPillTone("3 of 4 going")).toBe("dinner");
    expect(inferPlanPillTone("Farmers market + coast")).toBe("activity");
    expect(inferPlanPillTone("Trip Graph")).toBe("trip");
    expect(inferPlanPillTone("Live nearby")).toBe("live");
  });

  it("renders five fixture rows with correct pill tones", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <ChatsHome rows={FOUNDER_CHATS_PLAN_PILL_ROWS} onOpenChat={() => {}} />,
      );
    });

    const pills = host.querySelectorAll('[data-testid="chat-plan-pill"]');
    expect(pills.length).toBe(5);
    expect(pills[0]?.getAttribute("data-plan-tone")).toBe("dinner");
    expect(pills[0]?.textContent).toContain("Juniper & Ivy · 7:30 PM");
    expect(pills[1]?.getAttribute("data-plan-tone")).toBe("activity");
    expect(pills[2]?.getAttribute("data-plan-tone")).toBe("dinner");
    expect(pills[2]?.textContent).toContain("3 of 4 going");
    expect(pills[3]?.getAttribute("data-plan-tone")).toBe("live");
    expect(pills[4]?.getAttribute("data-plan-tone")).toBe("trip");

    const connections = [...host.querySelectorAll('[data-testid="chat-connection-label"]')].map(
      (el) => el.textContent,
    );
    expect(connections).toEqual([
      "Direct connection",
      "Direct connection",
      "4 people · Group",
      "Direct connection",
      "Following + connected",
    ]);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it("pill click opens plan and does not open chat", async () => {
    const onOpenChat = vi.fn();
    const onOpenPlan = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <ChatsHome
          rows={FOUNDER_CHATS_PLAN_PILL_ROWS}
          onOpenChat={onOpenChat}
          onOpenPlan={onOpenPlan}
        />,
      );
    });

    const pill = host.querySelector(
      '[data-testid="chat-plan-pill"][data-plan-id="seed-chanelle-juniper"]',
    ) as HTMLElement;
    expect(pill).toBeTruthy();
    await act(async () => {
      pill.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onOpenPlan).toHaveBeenCalledWith(
      "seed-chanelle-juniper",
      expect.objectContaining({ name: "Chanelle" }),
    );
    expect(onOpenChat).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
