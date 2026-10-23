/**
 * @vitest-environment jsdom
 *
 * Repair #20 amendment wave, Cluster CF - GLASS FIXES pins.
 *
 * R-4 DOCK ANCHORING: the dock (.c2s-dock) is viewport-anchored
 * (position: fixed, bottom + safe-area, the column's max width
 * centered) and the long-press CardContextMenu mounts through the
 * TopLayer portal at document.body - never inline inside a
 * scrolling ancestor. HONEST SCOPE: jsdom has no layout engine, so
 * these pins assert the positioning CONTRACT (the shipped CSS
 * values) and the DOM MOUNT POINT (portal at body, outside the
 * invoking scroll subtree). They cannot prove rendered geometry;
 * the coordinator re-verifies the anchor at the glass.
 *
 * R-5 STRAY DOTS: the preparation spine's bare arc dots are gone;
 * each item's phase + state rides its row as a labeled marker.
 *
 * R-6 LIMBO PRECISION: a pending-but-unwindowed plan renders no
 * cooling treatment, and the remaining-window line renders in its
 * own legible class (the one urgency-carrying text on the card).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CardContextMenu } from "./CardContextMenu";
import { PlanCardC2 } from "./PlanCardC2";
import { PreparationSpine } from "./shell/PreparationSpine";
import { limboFromPlan } from "./shell/shellData";
import type { SpineItem } from "./shell/density";
import type { OpalPlanContract } from "../api/productClient";

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
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

const shellCss = readFileSync(resolve(__dirname, "./shell/c2shell.css"), "utf8");
const cardCss = readFileSync(resolve(__dirname, "./c2.css"), "utf8");

describe("R-4 - the dock's positioning contract is viewport anchoring", () => {
  it("the dock rule is fixed, bottom-anchored, and width-capped to the column", () => {
    const dock = shellCss.match(/\.c2s-dock\s*\{([^}]*)\}/);
    expect(dock).not.toBeNull();
    expect(dock![1]).toContain("position: fixed");
    expect(dock![1]).not.toContain("position: absolute");
    expect(dock![1]).toMatch(/bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom/);
    expect(dock![1]).toContain(
      "width: min(calc(100% - 24px), calc(var(--content-max) - 24px))",
    );
    expect(dock![1]).toContain("margin-inline: auto");
    // The wide layout still retires the dock for the sidebar.
    expect(shellCss).toMatch(
      /@media \(min-width: 900px\) \{[\s\S]*?\.c2s-dock \{\s*display: none;/,
    );
  });

  it("the menu scrim keeps its viewport contract (fixed, inset 0)", () => {
    const scrim = shellCss.match(/\.c2s-menu-scrim\s*\{([^}]*)\}/);
    expect(scrim).not.toBeNull();
    expect(scrim![1]).toContain("position: fixed");
    expect(scrim![1]).toContain("inset: 0");
  });
});

describe("R-4 - the long-press menu mounts through the portal, not the scroll subtree", () => {
  it("renders at document.body via TopLayer, outside the invoking wrapper, panel design intact", async () => {
    const container = await render(
      <div className="c2s-scroll" data-testid="invoking-scroll">
        <CardContextMenu
          title="Dinner at Juniper"
          items={[{ id: "open", label: "Open graph", onSelect: () => {} }]}
          onClose={() => {}}
          stateFamily="ready"
          stateLabel="Ready"
        />
      </div>,
    );
    // Not inside the invoking scroll subtree...
    expect(
      container.querySelector('[data-testid="invoking-scroll"]')!.querySelector(
        '[data-testid="card-context-menu"]',
      ),
    ).toBeNull();
    // ...but at body level inside the TopLayer portal host.
    const portal = document.body.querySelector('[data-top-layer="portal-body"]');
    expect(portal).not.toBeNull();
    expect(portal!.getAttribute("data-top-layer-band")).toBe("sheet");
    const menu = portal!.querySelector('[data-testid="card-context-menu"]');
    expect(menu).not.toBeNull();
    // The protected card design is untouched: same panel, head, pill, Cancel.
    const panel = menu!.querySelector(".c2s-menu-panel");
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute("data-plan-state")).toBe("ready");
    expect(panel!.querySelector(".c2s-menu-head")).not.toBeNull();
    expect(panel!.querySelector('[data-testid="card-menu-cancel"]')).not.toBeNull();
  });

  it("the menu source renders through TopLayer (mount-point pin)", () => {
    const src = readFileSync(resolve(__dirname, "./CardContextMenu.tsx"), "utf8");
    expect(src).toContain('<TopLayer band="sheet">');
    expect(src).toContain('from "../opalUi/TopLayer"');
  });
});

const spineItems: SpineItem[] = [
  {
    id: "intent",
    phase: "intent",
    label: "Dinner at Juniper was suggested",
    state: "done",
    stateLine: "Done - the idea is on the table.",
    owner: "you",
    ownerLine: "Yours",
    arcPosition: 0,
    action: null,
  },
  {
    id: "step-food",
    phase: "preparation",
    label: "Sort the food",
    state: "needs-you",
    stateLine: "Needs you - pick a place to order from.",
    owner: "you",
    ownerLine: "Yours to do",
    arcPosition: 0.4,
    action: null,
  },
  {
    id: "event",
    phase: "event",
    label: "Dinner at Juniper",
    state: "waiting",
    stateLine: "Waiting - Saturday at 7:30 PM.",
    owner: "opal",
    ownerLine: "Opal",
    arcPosition: 0.65,
    action: null,
  },
];

describe("R-5 - the spine's bare arc dots are gone; state is a labeled marker", () => {
  it("renders no arc, no dot nodes - and one labeled marker per item", async () => {
    const container = await render(<PreparationSpine spine={spineItems} />);
    expect(container.querySelector(".c2s-spine-arc")).toBeNull();
    expect(container.querySelectorAll('[data-testid="c2-spine-node"]')).toHaveLength(0);
    const markers = [...container.querySelectorAll('[data-testid="c2-spine-marker"]')];
    expect(markers).toHaveLength(spineItems.length);
    // Repair #28 (W28-4): the marker names ONLY the state, in
    // human words - the phase word duplicated the row's own title
    // ("Settles into memory" beside "Settling into memory -
    // waiting"). Phase/state still ride the data attributes.
    expect(markers[0].textContent?.trim()).toBe("Done");
    expect(markers[0].getAttribute("data-spine-phase")).toBe("intent");
    expect(markers[0].getAttribute("data-spine-state")).toBe("done");
    expect(markers[1].textContent?.trim()).toBe("Needs you");
    expect(markers[2].textContent?.trim()).toBe("Waiting");
    // The row's second line is the state line alone - no owner
    // fragment jammed onto its end.
    const lines = [...container.querySelectorAll(".c2s-card-line")].map((el) => el.textContent);
    expect(lines[0]).toBe("Done - the idea is on the table.");
    expect(lines[1]).toBe("Needs you - pick a place to order from.");
    expect(lines[2]).toBe("Waiting - Saturday at 7:30 PM.");
    // The items themselves still render with their finished lines.
    const items = container.querySelectorAll('[data-testid="c2-spine-item"]');
    expect(items).toHaveLength(spineItems.length);
  });

  it("the spine source carries no bare-dot render (disposition pin)", () => {
    const src = readFileSync(
      resolve(__dirname, "./shell/PreparationSpine.tsx"),
      "utf8",
    );
    expect(src).not.toContain("c2s-spine-arc");
    expect(src).not.toContain("c2-spine-node");
    expect(src).not.toContain("arcPosition * 100");
  });
});

describe("R-6 - limbo precision: no window, no cooling; the window line is legible", () => {
  const pendingCard = {
    stateFamily: "action",
    stateLabel: "Action needed",
    title: "Dinner at Juniper",
    whenLine: "Saturday at 7:30 PM",
  };

  it("a pending-but-unwindowed plan renders NO cooling treatment", async () => {
    const container = await render(
      <PlanCardC2 input={{ ...pendingCard, limbo: null }} />,
    );
    expect(container.querySelector('[data-testid="c2-plan-limbo"]')).toBeNull();
    expect(
      container
        .querySelector('[data-testid="c2-plan-card"]')
        ?.getAttribute("data-limbo"),
    ).toBeNull();
  });

  it("a limbo object that is not in the limbo state renders no treatment either", async () => {
    const container = await render(
      <PlanCardC2
        input={{
          ...pendingCard,
          limbo: {
            state: "waiting",
            treatment: "cooling",
            patternChannel: "cooling-lines",
            windowFractionRemaining: 0.5,
            copy: "Waiting to hear back.",
            viewerRole: "recipient",
          },
        }}
      />,
    );
    expect(container.querySelector('[data-testid="c2-plan-limbo"]')).toBeNull();
  });

  it("limboFromPlan: no etiquette limbo state, no limbo input", () => {
    const base = { id: "p1", title: "Dinner", status: "tentative" } as OpalPlanContract;
    expect(limboFromPlan({ ...base, etiquette: null })).toBeNull();
    expect(
      limboFromPlan({
        ...base,
        etiquette: {
          plan_id: "p1",
          viewer_role: "recipient",
          stage: "awaiting_response",
          limbo: null,
          window: {
            set: false,
            closes_at: null,
            seconds: null,
            available: false,
            unavailable_reason: "no_window",
          },
        },
      }),
    ).toBeNull();
    const limbo = limboFromPlan({
      ...base,
      etiquette: {
        plan_id: "p1",
        viewer_role: "recipient",
        stage: "limbo",
        limbo: {
          state: "limbo",
          treatment: "cooling",
          pattern_channel: "cooling-lines",
          window_fraction_remaining: 0.25,
          remaining_window_text: "Less than an hour left in the answer window.",
          copy: "Your answer window is still open. Either answer is a kind one.",
        },
        window: {
          set: true,
          closes_at: null,
          seconds: null,
          available: true,
          unavailable_reason: null,
        },
      },
    });
    expect(limbo?.state).toBe("limbo");
    expect(limbo?.remainingWindowText).toBe(
      "Less than an hour left in the answer window.",
    );
  });

  it("the remaining-window line renders in its own legible class, present in the limbo render", async () => {
    const container = await render(
      <PlanCardC2
        input={{
          ...pendingCard,
          limbo: {
            state: "limbo",
            treatment: "cooling",
            patternChannel: "cooling-lines",
            windowFractionRemaining: 0.25,
            remainingWindowText: "Less than an hour left in the answer window.",
            copy: "Your answer window for Dinner at Juniper is still open. Either answer is a kind one.",
            viewerRole: "recipient",
          },
        }}
      />,
    );
    const strip = container.querySelector('[data-testid="c2-plan-limbo"]');
    expect(strip).not.toBeNull();
    expect(strip!.textContent).toContain("Either answer is a kind one");
    const windowLine = container.querySelector('[data-testid="c2-plan-limbo-window"]');
    expect(windowLine).not.toBeNull();
    expect(windowLine!.textContent).toContain(
      "Less than an hour left in the answer window.",
    );
    expect(windowLine!.className).toContain("c2-plan-limbo-window");
    expect(windowLine!.className).not.toContain("c2-plan-limbo-copy");
  });

  it("the window class carries presence in CSS - body size, semibold, never action red", () => {
    const rule = cardCss.match(/\.c2-plan-limbo-window\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain("font: var(--type-body)");
    expect(rule![1]).toMatch(/font-weight:\s*650/);
    expect(rule![1]).toContain("var(--state-limbo-ink)");
    expect(rule![1]).not.toContain("--state-action");
  });
});
