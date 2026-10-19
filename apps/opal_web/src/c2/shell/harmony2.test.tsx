/**
 * @vitest-environment jsdom
 *
 * Repair #18 harmony2 - regressions for the final harmony scope:
 * - 6a: Graphs goal rows carry the link/unlink plan picker
 *   (adopt1 4.C10's named missing leg): plans come from the owner's
 *   real plan projection; taps call the named events.
 * - 6b: the holding answer's per-figure links render as tappable
 *   chips in chat (adopt1 4.C1's named missing leg): the parser
 *   reads metadata.holding's counters + links verbatim, and a chip
 *   tap routes to its named surface.
 * - HA-B: a retry control retries the FAILED operation - the Graphs
 *   error state's Try again calls retryLoad, never navigation; with
 *   no retry handler there is no Try again button at all.
 * - HA-A / icon / Center composer / deck fold: source + asset pins
 *   in the unifyDrift idiom (the wide composition and the CSS-layer
 *   treatments are layout facts jsdom cannot measure).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { C2Graphs, type C2GraphsEvents } from "./C2Graphs";
import { graphListFromPlans } from "./shellData";
import { holdingFiguresFromMetadata } from "./C1ShellHosts";
import { CenterChat } from "../../opalUi/c1/C1Surfaces";
import type { GraphListProjection } from "./projections";
import { ORB_ASSETS } from "../../brand/orb/orbTokens";

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
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

function q(selector: string) {
  return host!.querySelector(selector);
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const baseEvents: C2GraphsEvents = {
  openGraph: () => undefined,
  createPlan: () => undefined,
  createTrip: () => undefined,
  createIdea: () => undefined,
  completeSlot: () => undefined,
  dropPlan: async () => null,
  runNextAction: () => undefined,
  addPeople: () => undefined,
  openChatForPlan: () => undefined,
  back: () => undefined,
};

function projectionWithGoal(linkedPlanIds: string[]): GraphListProjection {
  const base = graphListFromPlans([]);
  return {
    ...base,
    groups: [
      {
        id: "coming-up",
        kind: "coming-up",
        title: "Coming up",
        cards: [
          {
            id: "p1",
            stateFamily: "ready",
            stateLabel: "Ready",
            title: "Dinner at Juniper",
            whenLine: "Saturday, 7 PM",
          },
        ],
      },
    ],
    adopt1: {
      people: [],
      intentions: [],
      goals: [
        {
          id: "g1",
          title: "See Dad monthly",
          linked_plan_ids: linkedPlanIds,
          linked_count: linkedPlanIds.length,
          completed_count: 0,
          last_completed: null,
          next_upcoming: null,
          status_line: "No plans linked yet.",
          created_at: "2026-09-01T00:00:00Z",
        },
      ],
      shelf: { sparks: [], starters: [] },
    },
  };
}

describe("harmony2 6a - goal link/unlink picker", () => {
  it("links an unlinked plan through the named event", async () => {
    const linkGoalPlan = vi.fn(async () => undefined);
    const unlinkGoalPlan = vi.fn(async () => undefined);
    await render(
      <C2Graphs
        projection={projectionWithGoal([])}
        events={{ ...baseEvents, linkGoalPlan, unlinkGoalPlan }}
      />,
    );
    await click(q('[data-testid="c2-goal-picker-g1"]')!);
    const link = q('[data-testid="c2-goal-link-p1"]');
    expect(link).not.toBeNull();
    expect(q('[data-testid="c2-goal-picker-list-g1"]')?.textContent).toContain(
      "Dinner at Juniper",
    );
    await click(link!);
    expect(linkGoalPlan).toHaveBeenCalledWith("g1", "p1");
    expect(unlinkGoalPlan).not.toHaveBeenCalled();
  });

  it("unlinks a linked plan through the named event", async () => {
    const linkGoalPlan = vi.fn(async () => undefined);
    const unlinkGoalPlan = vi.fn(async () => undefined);
    await render(
      <C2Graphs
        projection={projectionWithGoal(["p1"])}
        events={{ ...baseEvents, linkGoalPlan, unlinkGoalPlan }}
      />,
    );
    await click(q('[data-testid="c2-goal-picker-g1"]')!);
    const unlink = q('[data-testid="c2-goal-unlink-p1"]');
    expect(unlink).not.toBeNull();
    await click(unlink!);
    expect(unlinkGoalPlan).toHaveBeenCalledWith("g1", "p1");
    expect(linkGoalPlan).not.toHaveBeenCalled();
  });

  it("without the picker handlers no picker renders", async () => {
    await render(<C2Graphs projection={projectionWithGoal([])} events={baseEvents} />);
    expect(q('[data-testid="c2-goal-picker-g1"]')).toBeNull();
  });
});

describe("harmony2 HA-B - retry retries the failed thing", () => {
  it("Graphs Try again calls retryLoad, never back", async () => {
    const retryLoad = vi.fn();
    const back = vi.fn();
    const projection: GraphListProjection = {
      ...graphListFromPlans([]),
      listError: "Your plans did not load.",
    };
    await render(
      <C2Graphs projection={projection} events={{ ...baseEvents, retryLoad, back }} />,
    );
    const error = q('[data-testid="c2-graphs-error"]');
    expect(error).not.toBeNull();
    const button = [...error!.querySelectorAll("button")].find(
      (b) => b.textContent === "Try again",
    );
    expect(button).toBeTruthy();
    await click(button!);
    expect(retryLoad).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it("with no retry handler the error state offers no Try again", async () => {
    const projection: GraphListProjection = {
      ...graphListFromPlans([]),
      listError: "Your plans did not load.",
    };
    await render(<C2Graphs projection={projection} events={baseEvents} />);
    const error = q('[data-testid="c2-graphs-error"]');
    expect(error).not.toBeNull();
    const labels = [...error!.querySelectorAll("button")].map((b) => b.textContent);
    expect(labels).not.toContain("Try again");
  });
});

describe("harmony2 6b - holding chips", () => {
  const holdingMetadata = {
    holding: {
      counters: {
        plans_in_motion: 3,
        approvals_waiting: 1,
        memories_held: 1,
        sources_connected: 2,
      },
      links: {
        plans_in_motion: "graphs",
        approvals_waiting: "graphs",
        memories_held: "what-opal-remembers",
        sources_connected: "connections",
      },
      answer_text: "Here is what I am holding for you.",
    },
  };

  it("parses counters + links into finished figures", () => {
    const figures = holdingFiguresFromMetadata(holdingMetadata);
    expect(figures).toEqual([
      { key: "plans_in_motion", label: "3 plans in motion", target: "graphs" },
      { key: "approvals_waiting", label: "1 waiting on your answer", target: "graphs" },
      { key: "memories_held", label: "1 memory held", target: "what-opal-remembers" },
      { key: "sources_connected", label: "2 sources connected", target: "connections" },
    ]);
  });

  it("a figure without a counter or a link never renders", () => {
    expect(holdingFiguresFromMetadata(null)).toBeNull();
    expect(holdingFiguresFromMetadata({ plan_id: "p1" })).toBeNull();
    const partial = holdingFiguresFromMetadata({
      holding: {
        counters: { plans_in_motion: 2 },
        links: { plans_in_motion: "graphs" },
      },
    });
    expect(partial).toEqual([
      { key: "plans_in_motion", label: "2 plans in motion", target: "graphs" },
    ]);
  });

  it("renders the chips in chat and a tap routes to its surface", async () => {
    const onHoldingLink = vi.fn();
    await render(
      <CenterChat
        title="Opal"
        messages={[
          {
            id: "m1",
            authorKind: "opal",
            body: "Here is what I am holding for you: 3 plans in motion.",
            holdingFigures: holdingFiguresFromMetadata(holdingMetadata),
          },
        ]}
        plansById={new Map()}
        onSend={() => undefined}
        onHoldingLink={onHoldingLink}
      />,
    );
    expect(q('[data-testid="holding-chips"]')).not.toBeNull();
    await click(q('[data-testid="holding-chip-memories_held"]')!);
    expect(onHoldingLink).toHaveBeenCalledWith("what-opal-remembers");
    await click(q('[data-testid="holding-chip-plans_in_motion"]')!);
    expect(onHoldingLink).toHaveBeenCalledWith("graphs");
  });
});

describe("harmony2 HA-A / icon / composer / deck - source pins", () => {
  const webRoot = resolve(__dirname, "../../..");
  const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

  it("HA-A: the wide sidebar exists in shell + CSS, in dock order, dock retired wide", () => {
    const shell = read("src/c2/shell/C2Shell.tsx");
    const order = [
      "c2-side-home",
      "c2-side-chats",
      "c2-side-center",
      "c2-side-graphs",
      "c2-side-you",
    ].map((id) => shell.indexOf(id));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(shell).toContain('data-testid="c2-you-nav"');
    const css = read("src/c2/shell/c2shell.css");
    const wide = css.slice(css.indexOf("@media (min-width: 900px)"));
    expect(wide).toContain(".c2s-sidebar");
    expect(wide).toContain(".c2s-dock");
    expect(wide).toContain("display: none");
    // Phone composition unchanged: the sidebars render nothing narrow.
    const narrow = css.slice(0, css.indexOf("@media (min-width: 900px)"));
    expect(narrow).toContain(".c2s-sidebar");
  });

  it("icon pass: the orb icon master exists as a real PNG and is the ORB_ASSETS icon", () => {
    expect(ORB_ASSETS.icon1024).toBe("/brand/orb/opal-orb-icon-1024.png");
    const bytes = readFileSync(
      resolve(webRoot, "public/brand/orb/opal-orb-icon-1024.png"),
    );
    // PNG magic.
    expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const script = read("scripts/orb/build_icon_assets.py");
    expect(script).toContain("opal-orb-master-full.webp");
    expect(script).toContain("DERIVE, DON'T REDRAW");
  });

  it("Center composer: the ambient treatment covers the Center contexts in-layer", () => {
    const unify = read("src/theme/unifyChats.css");
    expect(unify).toContain('[data-testid="composer"].composer-618.opal-composer-brand');
    expect(unify).toContain(".opal-center-chat-composer.opal-composer");
    expect(unify).not.toContain("--opal-composer-gradient");
  });

  it("focus outline in the C2 shell takes the sampled accent, not the legacy teal", () => {
    const unify = read("src/theme/unifyChats.css");
    expect(unify).toContain('[data-shell="c2"] input:focus-visible');
    expect(unify).toContain("outline-color: var(--accent-1)");
  });

  it("deck fold: the deck's bottom pad clears the dock plus breathing steps", () => {
    const opening = read("src/c2/shell/C2CenterOpening.tsx");
    // Deckfix F3: two breathing steps - the second lands the
    // max-scroll top edge past the Taking-shape heading so the
    // scrolled deck probes 0 clipped, as the full pack recorded.
    expect(opening).toContain("calc(var(--dock-clearance) + var(--space-5) + var(--space-5))");
    const css = read("src/c2/shell/c2shell.css");
    expect(css).toContain('[data-testid="c2-center-opening"]');
    expect(css).toContain("scroll-padding-bottom");
    expect(css).toContain("scroll-margin-bottom");
  });
});
