/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { ChatsHome } from "./ChatsHome";
import {
  FOUNDER_CHATS_PLAN_PILL_ROWS,
  founderSeedThreadMessages,
  inferPlanPillTone,
  isFounderSeedChatId,
  overlayFounderSeedNamesOnChats,
  remapFounderChatRowsToLive,
  resolveFounderSeedThread,
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
    expect(pills[1]?.textContent).toContain("Farmers market + coast");
    expect(pills[2]?.getAttribute("data-plan-tone")).toBe("dinner");
    expect(pills[2]?.textContent).toContain("3 of 4 going");
    expect(pills[3]?.getAttribute("data-plan-tone")).toBe("live");
    expect(pills[4]?.getAttribute("data-plan-tone")).toBe("trip");

    const connections = [...host.querySelectorAll('[data-testid="chat-connection-label"]')].map(
      (el) => el.textContent,
    );
    expect(connections).toEqual([
      "Fiancée",
      "Close friend",
      "4 people · Group",
      "Neighbor",
      "Following",
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

  it("detects seed-chat ids", () => {
    expect(isFounderSeedChatId("seed-chat-chanelle")).toBe(true);
    expect(isFounderSeedChatId("938ee21c-e675-4cf6-b705-265adda9a6db")).toBe(false);
  });

  it("remaps seed rows onto live conversation ids by name", () => {
    const remapped = remapFounderChatRowsToLive(FOUNDER_CHATS_PLAN_PILL_ROWS, [
      {
        id: "live-chanelle",
        name: "Chanelle",
        kind: "direct",
        preview: "Real Chanelle preview",
        when: "1m",
      },
      {
        id: "live-maya",
        name: "Maya",
        kind: "direct",
      },
      {
        id: "live-crew",
        name: "Saturday Crew",
        kind: "group",
        memberCount: 3,
      },
      {
        id: "live-sabrina",
        name: "Sabrina",
        kind: "direct",
      },
      {
        id: "live-alex",
        name: "Alex",
        kind: "direct",
      },
    ]);

    expect(remapped.map((r) => r.id)).toEqual([
      "live-chanelle",
      "live-maya",
      "live-crew",
      "live-sabrina",
      "live-alex",
    ]);
    expect(remapped[0]?.planConsequence?.label).toContain("Juniper");
    // Seed list chrome wins — live preview must not overwrite approved copy.
    expect(remapped[0]?.preview).toBe("Perfect. I'll grab a table.");
    expect(remapped[0]?.id).toBe("live-chanelle");
    expect(remapped.every((r) => !isFounderSeedChatId(r.id))).toBe(true);
  });

  it("keeps seed ids when no live match exists", () => {
    const remapped = remapFounderChatRowsToLive(FOUNDER_CHATS_PLAN_PILL_ROWS, []);
    expect(remapped.every((r) => isFounderSeedChatId(r.id))).toBe(true);
  });

  it("overlay replaces Conversation/Founder/empty with seed walk names", () => {
    const live = [
      { id: "live-1", name: "Conversation" },
      { id: "live-2", name: "Founder" },
      { id: "live-3", name: "" },
      { id: "live-4", name: "Conversation" },
      { id: "live-5", name: "Founder, Founder" },
    ];
    const overlaid = overlayFounderSeedNamesOnChats(live);
    expect(overlaid.map((c) => c.name)).toEqual([
      "Chanelle",
      "Maya",
      "Juniper crew",
      "Sabrina",
      "Alex",
    ]);
    expect(overlaid.every((c) => !/^(conversation|founder)/i.test(c.name))).toBe(true);
  });

  it("resolves Chanelle seed thread with Opal Juniper plan filament", () => {
    const turns = resolveFounderSeedThread({ conversationId: "seed-chat-chanelle" });
    expect(turns.length).toBeGreaterThanOrEqual(4);
    expect(turns.some((t) => /Juniper tonight/i.test(t.body))).toBe(true);
    expect(turns.some((t) => /I can do 7:30/i.test(t.body))).toBe(true);
    const filament = turns.find((t) => t.opalSystemConsequence || t.opalFilament);
    expect(filament?.body).toMatch(/Opal lined this up/);
    expect(filament?.body).toMatch(/Juniper & Ivy/);
    expect(filament?.body).toMatch(/7:30/);
  });

  it("each seed chat has a unique 4–8 turn thread matching its preview", () => {
    for (const row of FOUNDER_CHATS_PLAN_PILL_ROWS) {
      const turns = resolveFounderSeedThread({ conversationId: row.id, displayName: row.name });
      const humans = turns.filter((t) => !t.opalFilament && !t.opalSystemConsequence);
      expect(humans.length, row.name).toBeGreaterThanOrEqual(4);
      expect(humans.every((t) => (t.body || "").trim().length > 0), row.name).toBe(true);
      const last = humans[humans.length - 1];
      expect(last?.body, row.name).toBe(row.preview);
      // Group rows should label peer speakers
      if (row.kind === "group") {
        expect(humans.some((t) => t.from === "them" && !!t.senderDisplayName), row.name).toBe(true);
      }
    }
    // Distinct arcs — no shared first-line copy across chats
    const firstBodies = FOUNDER_CHATS_PLAN_PILL_ROWS.map((row) => {
      const turns = resolveFounderSeedThread({ conversationId: row.id });
      return turns.find((t) => !t.opalFilament)?.body;
    });
    expect(new Set(firstBodies).size).toBe(firstBodies.length);
  });

  it("resolves remapped live UUID thread by display name", () => {
    const turns = resolveFounderSeedThread({
      conversationId: "938ee21c-e675-4cf6-b705-265adda9a6db",
      displayName: "Chanelle",
    });
    expect(turns.some((t) => t.opalSystemConsequence)).toBe(true);
    expect(turns.find((t) => t.from === "them" && !t.opalFilament)?.senderDisplayName).toBe(
      "Chanelle",
    );
  });

  it("Maya planId correlates to Graphs coast seed", () => {
    const maya = FOUNDER_CHATS_PLAN_PILL_ROWS.find((r) => r.name === "Maya");
    expect(maya?.planConsequence?.planId).toBe("seed-maya-graph-coast");
    expect(maya?.planConsequence?.label).toBe("Farmers market + coast");
  });

  it("Maya counter-proposal gets an Opal closing response", () => {
    const turns = resolveFounderSeedThread({ conversationId: "seed-chat-maya" });
    const humans = turns.filter((t) => !t.opalFilament && !t.opalSystemConsequence);
    expect(humans[humans.length - 1]?.body).toBe("I'm free after 10");
    const close = turns.find((t) => /10:30 market/i.test(t.body));
    expect(close?.opalFilament || close?.opalSystemConsequence).toBeTruthy();
    expect(close?.body).toMatch(/Got it/i);
    expect(close?.body).toMatch(/coast/i);
    // Closing turn must follow the counter-proposal
    const afterIdx = turns.findIndex((t) => t.body === "I'm free after 10");
    const closeIdx = turns.findIndex((t) => t.id === close?.id);
    expect(closeIdx).toBeGreaterThan(afterIdx);
  });

  it("seed relationship labels are specific (not Direct connection)", () => {
    const byName = Object.fromEntries(
      FOUNDER_CHATS_PLAN_PILL_ROWS.map((r) => [r.name, r.relationshipLabel]),
    );
    expect(byName.Chanelle).toBe("Fiancée");
    expect(byName.Maya).toBe("Close friend");
    expect(byName["Juniper crew"]).toBe("4 people · Group");
    expect(byName.Sabrina).toBe("Neighbor");
    expect(byName.Alex).toBe("Following");
  });

  it("founderSeedThreadMessages strips Opal filaments for legacy callers", () => {
    const msgs = founderSeedThreadMessages("seed-chat-chanelle");
    expect(msgs.every((m) => !/Opal lined this up/i.test(m.body))).toBe(true);
    expect(msgs.some((m) => /Juniper tonight/i.test(m.body))).toBe(true);
  });
});
