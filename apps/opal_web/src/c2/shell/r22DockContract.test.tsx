/**
 * @vitest-environment jsdom
 *
 * Repair #22 - CLUSTER R22-G pins.
 *
 * WS-8 THE PAD DOT DIES (founder, 2026-10-21, reading the Flows
 * frames): the navigation pad showed a dot under the active item
 * in addition to the selection lighting. Founder: the dot "should
 * not be there - it takes space up in the navigation pad; the
 * selection lighting up is already enough to indicate it's been
 * selected." These pins hold the dot dead on every surface/mode
 * (the pad is one component - C2Shell's dock - rendered from one
 * stylesheet) and hold the W-10 lighting as the ONLY selection
 * signal: glyph (accent + scale), label (accent + full weight),
 * center disc (accent ring + glow), aria-current for the tree.
 *
 * WS-11 COMPOSER DOCK CONTRACT (R-4 / R20 dock law): the
 * "Message Opal" composer is DOCKED FIXED with the pad; room
 * content scrolls BENEATH the frost. Verdict per surface at the
 * R22 trace: thread = already docked (ThreadShell wraps its flow
 * in .c1-scroll; the composer bar is a sibling after the
 * scroller); orbit = already docked (OrbitScreen.css bounds the
 * embedded surface, its flow scrolls, the bar is flex: none);
 * Opal chat (plain CenterChat landing) = WAS SCROLLING - it
 * rendered its flow bare, so the host surface itself was the
 * scroller and the composer rode at the end of the content,
 * docked-looking only on short rooms. Fixed by giving CenterChat
 * the thread's own .c1-scroll construction. HONEST SCOPE (the
 * r20aGlass discipline): jsdom has no layout engine, so these
 * pins assert the positioning CONTRACT (shipped CSS values) and
 * the DOM STRUCTURE (composer bar outside the scroll box, after
 * it, in the surface's flex column). Rendered geometry is proven
 * at the glass by the signature-gated capture set under
 * shots/repair22/dock/.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Shell } from "./C2Shell";
import { CenterChat, ThreadShell } from "../../opalUi/c1/C1Surfaces";
import { saveProfile } from "../../api/productClient";

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
  return host;
}

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
  }
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
});

const shellCss = readFileSync(resolve(__dirname, "./c2shell.css"), "utf8");
const c1Css = readFileSync(resolve(__dirname, "../../opalUi/c1/c1.css"), "utf8");
const orbitCss = readFileSync(
  resolve(__dirname, "../../opalUi/c1/OrbitScreen.css"),
  "utf8",
);

const manyMessages = Array.from({ length: 30 }, (_, i) => ({
  id: `m-${i}`,
  authorKind: (i % 2 ? "opal" : "person") as "person" | "opal",
  body: `Message ${i} - a long room's worth of conversation.`,
  own: i % 3 === 0,
}));

/* ---------------- WS-8: the dot is dead ---------------- */

describe("R22 WS-8 - no active-item dot renders in the pad, in any mode", () => {
  it("c2shell.css carries NO ::after marker for the active slot or the center orb", () => {
    expect(shellCss).not.toMatch(/\.c2s-dock-slot\[data-active="1"\]::after/);
    expect(shellCss).not.toMatch(/\.c2s-dock-center\[data-active="1"\]::after/);
    // Over-deletion guard: the pad's own ::before/::after TOP BORDER
    // SEGMENTS (the halo break around the raised orb) are a
    // different construction and stay.
    expect(shellCss).toContain(".c2s-dock::before");
    expect(shellCss).toContain(".c2s-dock::after");
  });

  it("the W-10 lighting is intact and complete - it is now the only signal", () => {
    const glyph = shellCss.match(
      /\.c2s-dock-slot\[data-active="1"\] \.c2s-dock-glyph\s*\{([^}]*)\}/,
    );
    expect(glyph).not.toBeNull();
    expect(glyph![1]).toContain("color: var(--accent-1)");
    expect(glyph![1]).toContain("transform: scale(1.12)");
    const label = shellCss.match(
      /\.c2s-dock-slot\[data-active="1"\] \.c2s-dock-label\s*\{([^}]*)\}/,
    );
    expect(label).not.toBeNull();
    expect(label![1]).toContain("font-weight: 700");
    expect(label![1]).toContain("color: var(--accent-1)");
    const disc = shellCss.match(
      /\.c2s-dock-center\[data-active="1"\] \.c2s-dock-center-disc\s*\{([^}]*)\}/,
    );
    expect(disc).not.toBeNull();
    expect(disc![1]).toContain("border-color: var(--accent-1)");
    expect(disc![1]).toContain("0 0 0 2px");
    // The resting slot ink step stays, so active vs resting is a
    // one-second glance in both modes (accent on ink-3 rest).
    const slot = shellCss.match(/\.c2s-dock-slot\s*\{([^}]*)\}/);
    expect(slot).not.toBeNull();
    expect(slot![1]).toContain("color: var(--ink-3)");
    const activeSlot = shellCss.match(
      /\.c2s-dock-slot\[data-active="1"\]\s*\{([^}]*)\}/,
    );
    expect(activeSlot).not.toBeNull();
    expect(activeSlot![1]).toContain("color: var(--ink-1)");
  });

  it("the rendered pad: exactly one lit slot, state in aria-current, no marker node", async () => {
    saveProfile({
      access_token: "tok",
      user_id: "user-1",
      display_name: "Sam Rivera",
      handle: "sam",
      session_id: "sess-1",
    } as never);
    const container = await render(<C2Shell />);
    const dock = container.querySelector('[data-testid="c2-dock"]')!;
    expect(dock).not.toBeNull();
    const active = dock.querySelectorAll('[data-active="1"]');
    expect(active.length).toBe(1);
    // The state survives in the accessibility tree without the dot.
    expect(active[0].getAttribute("aria-current")).toBe("page");
    // A slot's children are exactly glyph + label (+ an unread
    // badge when one exists) - no dot element is painted by React.
    for (const slotEl of dock.querySelectorAll(".c2s-dock-slot")) {
      const classes = [...slotEl.children].map((c) => c.className);
      expect(classes[0]).toContain("c2s-dock-glyph");
      expect(classes[1]).toContain("c2s-dock-label");
      expect(classes.length).toBeLessThanOrEqual(3);
      if (classes.length === 3) expect(classes[2]).toContain("c2s-dock-badge");
    }
    // The center orb's children are the disc alone.
    const center = dock.querySelector('[data-testid="c2-dock-center"]')!;
    expect(center.children.length).toBe(1);
    expect(center.children[0].className).toContain("c2s-dock-center-disc");
  });
});

/* ---------------- WS-11: the composer is docked ---------------- */

describe("R22 WS-11 - thread: the composer bar lives OUTSIDE the scroll box", () => {
  it("flow inside .c1-scroll; bar a direct child of the surface, after the scroller", async () => {
    const container = await render(
      <ThreadShell
        name="Maya"
        initials="M"
        messages={manyMessages}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
        onSend={() => {}}
      />,
    );
    const surface = container.querySelector('[data-testid="thread-shell"]')!;
    const scroll = surface.querySelector(".c1-scroll")!;
    const bar = surface.querySelector('[data-testid="thread-composer-bar"]')!;
    expect(scroll).not.toBeNull();
    expect(scroll.contains(surface.querySelector(".c1-flow"))).toBe(true);
    expect(scroll.contains(bar)).toBe(false);
    expect(bar.parentElement).toBe(surface);
    // Document order in the surface's flex column: scroller, then bar.
    const kids = [...surface.children];
    expect(kids.indexOf(scroll)).toBeLessThan(kids.indexOf(bar));
  });
});

describe("R22 WS-11 - Opal chat: WAS SCROLLING, now docked like the thread", () => {
  it("plain landing: the flow is wrapped in .c1-scroll and the composer bar follows it", async () => {
    const container = await render(
      <CenterChat
        title="Opal"
        messages={manyMessages}
        plansById={new Map()}
        onSend={() => {}}
      />,
    );
    const surface = container.querySelector('[data-testid="center-chat"]')!;
    const scroll = surface.querySelector(".c1-scroll")!;
    expect(scroll).not.toBeNull();
    expect(scroll.contains(surface.querySelector(".c1-flow"))).toBe(true);
    const bar = surface.querySelector(".c1-composer-bar")!;
    expect(bar).not.toBeNull();
    expect(scroll.contains(bar)).toBe(false);
    expect(bar.parentElement).toBe(surface);
    expect(bar.contains(surface.querySelector('[data-testid="opal-chat-composer"]'))).toBe(
      true,
    );
    const kids = [...surface.children];
    expect(kids.indexOf(scroll)).toBeLessThan(kids.indexOf(bar));
  });

  it("orbit-embedded: the same docked structure (the orbit CSS re-boxes the surface around it)", async () => {
    const container = await render(
      <CenterChat
        title="Opal"
        embedded
        composerPlaceholder="Message Opal"
        messages={manyMessages}
        plansById={new Map()}
        onSend={() => {}}
      />,
    );
    const surface = container.querySelector('[data-testid="center-chat"]')!;
    expect(surface.getAttribute("data-embedded")).toBe("true");
    const scroll = surface.querySelector(".c1-scroll")!;
    expect(scroll).not.toBeNull();
    expect(scroll.contains(surface.querySelector(".c1-flow"))).toBe(true);
    const bar = surface.querySelector(".c1-composer-bar")!;
    expect(scroll.contains(bar)).toBe(false);
    expect(bar.parentElement).toBe(surface);
  });

  it("the scroll box is a real scroller in CSS, and the bar docks by margin-top: auto", () => {
    const scroll = c1Css.match(/\[data-design="r18"\] \.c1-scroll\s*\{([^}]*)\}/);
    expect(scroll).not.toBeNull();
    expect(scroll![1]).toContain("flex: 1");
    expect(scroll![1]).toContain("overflow-y: auto");
    const bar = c1Css.match(/\[data-design="r18"\] \.c1-composer-bar\s*\{([^}]*)\}/);
    expect(bar).not.toBeNull();
    expect(bar![1]).toContain("margin-top: auto");
  });
});

describe("R22 WS-11 - the dock layer itself: pad fixed, hosts contained", () => {
  it("the pad is viewport-fixed and the C1 host slot cannot grow past its box", () => {
    const dock = shellCss.match(/\.c2s-dock\s*\{([^}]*)\}/);
    expect(dock).not.toBeNull();
    expect(dock![1]).toContain("position: fixed");
    const hostRule = shellCss.match(/\.c2s-c1-host\s*\{([^}]*)\}/);
    expect(hostRule).not.toBeNull();
    expect(hostRule![1]).toContain("flex: 1");
    expect(hostRule![1]).toContain("min-height: 0");
    expect(hostRule![1]).toContain("overflow: hidden");
    const hostSurface = shellCss.match(
      /\.c2s-c1-host \.c1-surface\s*\{([^}]*)\}/,
    );
    expect(hostSurface).not.toBeNull();
    expect(hostSurface![1]).toContain("min-height: 0");
  });

  it("orbit: the embedded surface stays height-bounded with a scrolling flow and a fixed bar", () => {
    expect(orbitCss).toMatch(
      /\.orbit-field \.c1-surface \{[^}]*min-height: 0; height: 100%; overflow: hidden/,
    );
    expect(orbitCss).toMatch(
      /\.orbit-field \.c1-surface \.c1-flow \{[^}]*flex: 1; min-height: 0; overflow-y: auto/,
    );
    expect(orbitCss).toMatch(/\.orbit-field \.c1-composer-bar \{ flex: none; \}/);
  });
});
