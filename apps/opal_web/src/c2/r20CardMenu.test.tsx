/**
 * @vitest-environment jsdom
 *
 * Repair #20, F-3 — the long-press card menu craft pin.
 *
 * Founder review (2026-10-20): the long-press menu on graph cards
 * (Open graph / Make private / Cancel) looked like a slid-in
 * hover sheet - a borderless panel with square bottom corners
 * glued to the screen edge, its actions bare text rows, and no
 * connection to the card it came from. The rebuild makes it a
 * complete, bordered, finished card in the Your Move grammar:
 * full border + surface + card shadow, floating inside the
 * scrim, a head carrying the title and the plan's state pill,
 * actions as full 48px tappable rows with press states, Cancel
 * divided from the actions - and the invoking card's state as
 * the accent (canon --orb-indicator-* border mix + the 3px state
 * rule across the top edge; forming dashed, happening double
 * ring, past at rest).
 *
 * On the base build these pins fail (no data-plan-state, no pill,
 * no divider, sheet-form CSS); here they pass. Behavior pins
 * (items fire, Cancel/Escape close) pass on both - the behavior
 * law did not change, only the craft.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardContextMenu } from "./CardContextMenu";

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
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
  }
  host?.remove();
  host = null;
  root = null;
});

const items = (onSelect: () => void) => [
  { id: "open", label: "Open graph", testId: "menu-open", onSelect: () => {} },
  { id: "privacy", label: "Make private", testId: "menu-private", onSelect },
];

describe("R20 F-3 - the long-press menu is a finished card carrying the plan's state", () => {
  it("renders as a card: state on the panel, state pill beside the title, Cancel divided off", async () => {
    await render(
      <CardContextMenu
        title="Dinner at Juniper"
        items={items(() => {})}
        onClose={() => {}}
        stateFamily="action"
        stateLabel="Action needed"
      />,
    );
    const panel = host!.querySelector(".c2s-menu-panel")!;
    expect(panel).not.toBeNull();
    expect(panel.getAttribute("data-plan-state")).toBe("action");
    // AR-03: the state is named, never color alone.
    const pill = panel.querySelector('[data-testid="c2-plan-state-pill"]');
    expect(pill).not.toBeNull();
    expect(pill!.textContent).toContain("Action needed");
    expect(pill!.getAttribute("data-plan-state")).toBe("action");
    // The head groups title + pill.
    const head = panel.querySelector(".c2s-menu-head")!;
    expect(head.contains(panel.querySelector(".c2s-menu-title")!)).toBe(true);
    expect(head.contains(pill)).toBe(true);
    // Cancel is divided from the actions and styled as the quiet exit.
    const divider = panel.querySelector(".c2s-menu-divider");
    expect(divider).not.toBeNull();
    const cancel = panel.querySelector('[data-testid="card-menu-cancel"]')!;
    expect(cancel.className).toContain("c2s-menu-cancel");
    expect(panel.children[panel.children.length - 2]).toBe(divider);
    expect(panel.children[panel.children.length - 1]).toBe(cancel);
  });

  it("without a state the menu claims none: no data-plan-state, no pill", async () => {
    await render(<CardContextMenu title="Some card" items={items(() => {})} onClose={() => {}} />);
    const panel = host!.querySelector(".c2s-menu-panel")!;
    expect(panel.hasAttribute("data-plan-state")).toBe(false);
    expect(panel.querySelector('[data-testid="c2-plan-state-pill"]')).toBeNull();
  });

  it("behavior law unchanged: an item fires its action and closes; Cancel only closes", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    await render(
      <CardContextMenu
        title="Dinner at Juniper"
        items={items(onSelect)}
        onClose={onClose}
        stateFamily="ready"
        stateLabel="Ready"
      />,
    );
    await click(host!.querySelector('[data-testid="menu-private"]')!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    await click(host!.querySelector('[data-testid="card-menu-cancel"]')!);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("the shipped CSS is a bordered floating card, not a bottom sheet", () => {
    const css = readFileSync(resolve(__dirname, "./shell/c2shell.css"), "utf8");
    const panel = css.match(/\.c2s-menu-panel\s*\{([^}]*)\}/);
    expect(panel).not.toBeNull();
    expect(panel![1]).toMatch(/border:\s*1px solid var\(--line-2\)/);
    expect(panel![1]).toMatch(/border-radius:\s*var\(--radius-card, 16px\);/);
    expect(panel![1]).not.toMatch(/0 0;/);
    expect(panel![1]).toMatch(/box-shadow:\s*var\(--shadow-card\)/);
    expect(panel![1]).toMatch(/background:\s*var\(--surface-1\)/);
    // The scrim insets the card from the screen edges.
    const scrim = css.match(/\.c2s-menu-scrim\s*\{([^}]*)\}/);
    expect(scrim![1]).toMatch(/padding:/);
    // Items are full tappable rows with a press state.
    const item = css.match(/\.c2s-menu-item\s*\{([^}]*)\}/);
    expect(item![1]).toMatch(/min-height:\s*48px/);
    expect(item![1]).toMatch(/border-radius:\s*12px/);
    expect(css).toMatch(/\.c2s-menu-item:active/);
  });

  it("the state accent uses the canon tokens with each state's own pattern", () => {
    const css = readFileSync(resolve(__dirname, "./shell/c2shell.css"), "utf8");
    for (const family of ["action", "ready", "forming", "happening", "past"]) {
      expect(css).toContain(`.c2s-menu-panel[data-plan-state="${family}"]`);
    }
    expect(css).toMatch(
      /\.c2s-menu-panel\[data-plan-state="action"\]\s*\{[^}]*--orb-indicator-action/,
    );
    expect(css).toMatch(
      /\.c2s-menu-panel\[data-plan-state="ready"\]::before\s*\{[^}]*--orb-indicator-ready/,
    );
    // Forming keeps its dashed pattern channel, in the border and the rule.
    expect(css).toMatch(
      /\.c2s-menu-panel\[data-plan-state="forming"\]\s*\{[^}]*dashed[^}]*--orb-indicator-forming/,
    );
    expect(css).toMatch(
      /\.c2s-menu-panel\[data-plan-state="forming"\]::before\s*\{[^}]*repeating-linear-gradient/,
    );
    // Happening keeps its double ring (AR-F5 pattern channel).
    expect(css).toMatch(
      /\.c2s-menu-panel\[data-plan-state="happening"\]\s*\{[^}]*0 0 0 3px[^}]*--orb-indicator-happening/,
    );
    // No raw state hex enters the menu treatments.
    const menuCss = css.slice(css.indexOf("R20 F-3: the panel is rebuilt"));
    expect(menuCss).not.toMatch(/#FF4D5E|#FFC86B|#8B5CF6|#00E5FF/i);
  });

  it("C2Graphs wires the invoking card's finished state into both menus", () => {
    const src = readFileSync(resolve(__dirname, "./shell/C2Graphs.tsx"), "utf8");
    expect(src).toContain("stateFamily={cardMenu.stateFamily}");
    expect(src).toContain("stateLabel={cardMenu.stateLabel}");
    expect(src).toContain("stateFamily={detail.card.stateFamily}");
    expect(src).toContain("stateLabel={detail.card.stateLabel}");
  });
});
