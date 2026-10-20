/**
 * @vitest-environment jsdom
 *
 * Founder Polish Wave (Cluster C) - P3 surface sweep (web leg),
 * P4 orbit-sheet legibility, and Amendment A1 (long-press privacy).
 *
 * The backend leg (per-viewer marks at NextPlan / Reveal /
 * HomeProjection / ConversationAlignment / plan lists, two-account
 * no-leak) lives in the Elixir cases (r19_graphs_test +
 * repair19_ja02_private_projections_test). Here: the web adapters
 * and surfaces that consume the viewer's own is_private flag.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { C2GraphDetail } from "./C2Graphs";
import { graphListFromPlans, openingFromPlans } from "./shellData";
import type { GraphDetailProjection } from "./projections";
import type { OpalPlanContract } from "../../api/productClient";
import { OrbitSheet } from "../../opalUi/c1/OrbitSheet";
import { LongPressRegion, LONG_PRESS_MS } from "../CardContextMenu";

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
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

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

const plan = (id: string, extra: Partial<OpalPlanContract>): OpalPlanContract => ({
  id,
  title: id,
  status: "agreed",
  time_label: "Saturday 7 PM",
  location: "Juniper & Ivy",
  ...extra,
});

describe("P3 web sweep - the viewer's private plan is absent outside the vault, present inside it", () => {
  it("Graphs list adapter: private -> privateCards only; un-private -> groups again (both directions)", () => {
    const priv = graphListFromPlans([plan("open-plan", {}), plan("vault-plan", { is_private: true })]);
    expect(priv.groups.flatMap((g) => g.cards.map((c) => c.id))).toEqual(["open-plan"]);
    expect(priv.privateCards.map((c) => c.id)).toEqual(["vault-plan"]);
    expect(priv.lensCounts.all).toBe(1);

    const restored = graphListFromPlans([plan("open-plan", {}), plan("vault-plan", { is_private: false })]);
    expect(restored.groups.flatMap((g) => g.cards.map((c) => c.id)).sort()).toEqual([
      "open-plan",
      "vault-plan",
    ]);
    expect(restored.privateCards).toEqual([]);
    expect(restored.lensCounts.all).toBe(2);
  });

  it("Center deck opening: the shell's non-private filter keeps the vault plan out of the deck", () => {
    // C2Shell composes openingFromPlans over plans.filter(is_private !== true)
    // - the same composition, asserted at the adapter.
    const plans = [plan("open-plan", {}), plan("vault-plan", { is_private: true })];
    const opening = openingFromPlans(plans.filter((p) => p.is_private !== true), "Sam");
    expect(JSON.stringify(opening)).not.toContain("vault-plan");
    // Un-privating restores the plan to the deck composition.
    const restoredPlans = [plan("open-plan", {}), plan("vault-plan", { is_private: false })];
    const restored = openingFromPlans(restoredPlans.filter((p) => p.is_private !== true), "Sam");
    expect(JSON.stringify(restored)).toContain("vault-plan");
  });
});

describe("A1 - long-press pattern", () => {
  it("a held press opens the menu after LONG_PRESS_MS; a quick tap does not", async () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const el = await render(
      <LongPressRegion onLongPress={onLongPress}>
        <button type="button">Card</button>
      </LongPressRegion>,
    );
    const region = el.firstElementChild!;
    await act(async () => {
      region.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
    });
    await act(async () => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 50);
    });
    expect(onLongPress).not.toHaveBeenCalled();
    await act(async () => {
      region.dispatchEvent(new window.MouseEvent("pointerup", { bubbles: true }));
    });
    await act(async () => {
      vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    });
    expect(onLongPress).not.toHaveBeenCalled();

    await act(async () => {
      region.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
    });
    await act(async () => {
      vi.advanceTimersByTime(LONG_PRESS_MS + 10);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

describe("A1 - graph detail overflow is the keyboard path to Make private / Make public", () => {
  const detail = (isPrivate: boolean): GraphDetailProjection => ({
    id: "p1",
    title: "Dinner at Juniper",
    card: {
      id: "p1",
      stateFamily: "ready",
      stateLabel: "ready",
      title: "Dinner at Juniper",
      whenLine: "Saturday 7 PM",
      whereLine: "Juniper & Ivy",
      attendanceLine: "2 of 2 going",
      primaryActionLabel: null,
    } as GraphDetailProjection["card"],
    whenLine: "Saturday 7 PM",
    where: { label: "Juniper & Ivy", kind: "place", handoffLabel: null },
    who: [],
    activity: [],
    history: [],
    origin: "graphs",
    isPrivate,
  });

  const events = () => ({
    openGraph: vi.fn(),
    createPlan: vi.fn(),
    createTrip: vi.fn(),
    createIdea: vi.fn(),
    completeSlot: vi.fn(),
    dropPlan: vi.fn(async () => null),
    runNextAction: vi.fn(),
    addPeople: vi.fn(),
    openChatForPlan: vi.fn(),
    back: vi.fn(),
    setPlanPrivate: vi.fn(async () => undefined),
    graphLockPasscodeSet: true,
    unlockPrivate: vi.fn(async () => true),
    setPrivatePasscode: vi.fn(async () => true),
  });

  it("no always-visible toggle; overflow menu carries Make private, then Make public", async () => {
    const ev = events();
    await render(<C2GraphDetail detail={detail(false)} events={ev} />);
    expect(document.querySelector('[data-testid="c2-detail-private-toggle"]')).toBeNull();
    click(document.querySelector('[data-testid="c2-detail-overflow"]')!);
    await flush();
    const item = document.querySelector('[data-testid="c2-detail-private-toggle"]')!;
    expect(item.textContent).toContain("Make private");
    click(item);
    await flush();
    expect(ev.setPlanPrivate).toHaveBeenCalledWith("p1", true);

    await act(async () => root!.unmount());
    root = null;
    host?.remove();
    host = null;
    document.body.innerHTML = "";

    const ev2 = events();
    await render(<C2GraphDetail detail={detail(true)} events={ev2} />);
    click(document.querySelector('[data-testid="c2-detail-overflow"]')!);
    await flush();
    const item2 = document.querySelector('[data-testid="c2-detail-private-toggle"]')!;
    expect(item2.textContent).toContain("Make public");
    click(item2);
    await flush();
    expect(ev2.setPlanPrivate).toHaveBeenCalledWith("p1", false);
  });
});

describe("P4 - orbit sheet legibility + naming collision", () => {
  it("purpose header, labeled blocks, and no private row until Orbit options opens", async () => {
    const el = await render(
      <OrbitSheet
        anchor={{ type: "person", id: "user-jordan", label: "Jordan Ellis" }}
        plans={[{ id: "pl1", title: "Dinner at Juniper" }]}
        sessions={[]}
        onOpen={vi.fn()}
        onStartNew={vi.fn()}
        onRemove={vi.fn()}
        onTogglePrivate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(el.querySelector('[data-testid="orbit-sheet-purpose"]')!.textContent).toContain(
      "Everything Opal keeps together about Jordan Ellis",
    );
    expect(el.querySelector('[data-testid="orbit-sheet-plans-note"]')!.textContent).toContain(
      "Plans you share with Jordan Ellis",
    );
    expect(el.querySelector('[data-testid="orbit-sheet-chats-note"]')!.textContent).toContain(
      "never messages to Jordan Ellis",
    );
    expect(el.textContent).toContain("YOUR CHATS WITH OPAL");
    // A1: the hide toggle is not a sheet row.
    expect(el.querySelector('[data-testid="orbit-sheet-private-toggle"]')).toBeNull();
    click(el.querySelector('[data-testid="orbit-sheet-options"]')!);
    await flush();
    const toggle = el.querySelector('[data-testid="orbit-sheet-private-toggle"]')!;
    expect(toggle.textContent).toContain("Hide these Opal chats behind my passcode");
    expect(el.querySelector('[data-testid="orbit-sheet-private-note"]')!.textContent).toContain(
      "My private graphs",
    );
    // The sheet never calls the orbit-hide "make private" a graph action.
    expect(toggle.textContent).not.toContain("Make private");
  });
});
