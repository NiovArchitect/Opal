/**
 * Repair #19 W13 - recreation tests: event share card + person
 * profile, rendered from real record shapes; adapters tell the
 * truth (absent facts render nothing, no fabricated share URL).
 */
/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement | null = null;
let root: Root | null = null;
async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(node); });
  const h = host;
  const q = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  return {
    container: h,
    getByTestId: (id: string) => {
      const el = q(id);
      if (!el) throw new Error(`missing testid ${id}`);
      return { dataset: el.dataset, textContent: el.textContent, click: () => el.click() } as never;
    },
    queryByTestId: (id: string) => q(id) as never,
  };
}
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null; host?.remove(); host = null;
});
import { EventShareCard, SharePlanSheet } from "./EventShareCard";
import { PersonProfileSheet } from "./PersonProfile";
import { shareCardFromDetail, detailFromPlan } from "./shellData";
import { profileProjectionFor } from "./C1ShellHosts";
import type { GraphDetailProjection } from "./projections";
import type { OpalPlanContract } from "../../api/productClient";

const plan: OpalPlanContract = {
  id: "plan-1",
  title: "Dinner at Juniper and Ivy",
  status: "aligned",
  location: "Juniper and Ivy",
  time_label: "Thu 7:30 PM",
  going_count: 3,
  total_count: 4,
};

function detailWithWho(): GraphDetailProjection {
  const base = detailFromPlan(plan, "graphs");
  return {
    ...base,
    who: [
      { name: "Maya Chen", avatar: { initials: "MC", tint: 1 }, responseLabel: "Going" },
      { name: "Jordan Lee", avatar: { initials: "JL", tint: 2 }, responseLabel: "Going" },
      { name: "Sam Ortiz", avatar: { initials: "SO", tint: 3 }, responseLabel: "Invited" },
      { name: "Riley Fox", avatar: { initials: "RF", tint: 4 }, responseLabel: "Going" },
    ],
  };
}

describe("W13 event share card", () => {
  it("renders state language, title, time, place, people from the real record", async () => {
    const card = shareCardFromDetail(detailWithWho());
    const { getByTestId, container } = await render(<EventShareCard card={card} />);
    expect(getByTestId("r19-event-share-card").dataset.planState).toBe("ready");
    expect(container.textContent).toContain("Dinner at Juniper and Ivy");
    expect(container.textContent).toContain("Thu 7:30 PM");
    expect(container.textContent).toContain("Juniper and Ivy");
    expect(getByTestId("r19-share-people").textContent).toContain("+ 1 more");
    expect(card.textLines).toEqual([
      "Dinner at Juniper and Ivy",
      "Ready",
      "Thu 7:30 PM",
      "Juniper and Ivy",
      "3 of 4 going",
      "With Maya Chen, Jordan Lee, Sam Ortiz + 1 more",
    ]);
  });

  it("no roster -> no people row, and no share URL is ever fabricated", async () => {
    const card = shareCardFromDetail(detailFromPlan(plan, "graphs"));
    expect(card.peopleLine).toBeNull();
    const { queryByTestId, container } = await render(<EventShareCard card={card} />);
    expect(queryByTestId("r19-share-people")).toBeNull();
    expect(container.innerHTML).not.toMatch(/https?:\/\//);
    expect(card.textLines.join(" ")).not.toMatch(/https?:\/\//);
  });

  it("share sheet shows the card and a copy action with an honest note path", async () => {
    const card = shareCardFromDetail(detailWithWho());
    const { getByTestId } = await render(<SharePlanSheet card={card} onClose={() => {}} />);
    expect(getByTestId("r19-share-sheet")).toBeTruthy();
    expect(getByTestId("r19-share-copy")).toBeTruthy();
  });
});

describe("W13 person profile", () => {
  const conversation = {
    id: "conv-1",
    title: "Maya Chen",
    preview: "See you Thursday",
    updated_at: "2026-10-18T00:00:00Z",
    peers: [{ id: "user-maya", display_name: "Maya Chen", handle: "maya" }],
    entity_tint: 2,
    next_plan: null,
  } as never;

  it("adapter builds finished fields from conversation + relationship + next-plan fact", () => {
    const profile = profileProjectionFor(
      conversation,
      [{ contact_user_id: "user-maya", type: "close_friend" }],
      {
        plan_id: "plan-1",
        title: "Dinner at Juniper and Ivy",
        when_label: "Thu 7:30 PM",
        status: "aligned",
        state: "ready",
      } as never,
    );
    expect(profile.name).toBe("Maya Chen");
    expect(profile.handle).toBe("maya");
    // W24 (DL-12): a PERSON profile carries the SINGULAR tie —
    // "Close friends" is the circle GROUP header's grammar and was
    // the bug this wave fixes.
    expect(profile.relationshipLabel).toBe("Close friend");
    expect(profile.nextTogether?.stateLabel).toBe("Ready");
  });

  it("renders identity, relationship, next together; actions fire", async () => {
    const onMessage = vi.fn();
    const onMemory = vi.fn();
    const profile = profileProjectionFor(conversation, [], null);
    expect(profile.relationshipLabel).toBeNull();
    expect(profile.nextTogether).toBeNull();
    const { getByTestId, queryByTestId } = await render(
      <PersonProfileSheet
        profile={profile}
        onClose={() => {}}
        onMessage={onMessage}
        onOpenMemoryControls={onMemory}
      />,
    );
    expect(getByTestId("r19-profile-name").textContent).toBe("Maya Chen");
    expect(queryByTestId("r19-profile-relationship")).toBeNull();
    expect(queryByTestId("r19-profile-next")).toBeNull();
    getByTestId("r19-profile-message").click();
    getByTestId("r19-profile-memory").click();
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMemory).toHaveBeenCalledTimes(1);
  });
});
