/**
 * @vitest-environment jsdom
 *
 * Repair #18 (F18-01) - the convoy panel must never invent attendance.
 * Before this repair the panel defaulted to buildJuniperConvoyFixture()
 * and counted members whose travelState was not "left", so the Juniper
 * plan always read "4 of 4 going" regardless of any real RSVP. Now the
 * count comes only from the backend contract counts handed to the panel,
 * and the roster comes only from real members or contract participants.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { GraphConvoyPanel } from "./GraphConvoyPanel";
import { FOUNDER_ORIGIN_FIXTURE, JUNIPER_VENUE } from "./graphConvoyEta";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderPanel(props: React.ComponentProps<typeof GraphConvoyPanel>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<GraphConvoyPanel {...props} />);
  });
  return {
    host,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      host.remove();
    },
  };
}

describe("GraphConvoyPanel", () => {
  it("I'm on the way flips status and broadcasts (explicit coordinates, no roster)", async () => {
    const onBroadcastArrival = vi.fn();
    const { host, unmount } = await renderPanel({
      graphId: "seed-chanelle-juniper",
      graphName: "Juniper & Ivy",
      venue: JUNIPER_VENUE,
      origin: FOUNDER_ORIGIN_FIXTURE,
      onBroadcastArrival,
    });

    expect(host.querySelector('[data-testid="graph-convoy-panel"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="graph-eta-section"]')?.textContent).toMatch(
      /geometric estimate/i,
    );
    // No contract counts and no real participants: no count, no roster.
    expect(host.textContent).not.toMatch(/\d+ of \d+ going/);
    expect(host.querySelector('[data-testid="graph-convoy-going-count"]')).toBeNull();
    expect(host.querySelector('[data-testid="graph-convoy-list"]')).toBeNull();

    const btn = host.querySelector('[data-testid="graph-im-on-the-way"]') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(btn.getAttribute("data-travel-state")).toBe("on_the_way");
    expect(btn.textContent).toMatch(/On the way ✓/);
    expect(onBroadcastArrival).toHaveBeenCalledWith("on_the_way");

    await unmount();
  });

  it("Juniper-shaped fixture input renders NO '4 of 4' and no count at all without contract counts", async () => {
    // Exactly what the GraphDetailSheet fixture branch used to mount:
    // the Juniper graph with no contract fields behind it.
    const { host, unmount } = await renderPanel({
      graphId: "seed-chanelle-juniper",
      graphName: "Juniper & Ivy",
      ledBy: "Chanelle",
    });

    expect(host.textContent).not.toMatch(/4 of 4/);
    expect(host.textContent).not.toMatch(/\d+ of \d+ going/);
    expect(host.querySelector('[data-testid="graph-convoy-going-count"]')).toBeNull();
    // The fixture roster names never appear: no roster is rendered at all.
    expect(host.querySelector('[data-testid="graph-convoy-list"]')).toBeNull();
    expect(host.textContent).not.toMatch(/Jordan/);
    expect(host.textContent).not.toMatch(/Sabrina/);
    expect(host.textContent).not.toMatch(/Alex/);
    // No invented reservation time or party size either.
    expect(host.textContent).not.toMatch(/Table for 4/);
    expect(host.querySelector('[data-testid="graph-eta-section"]')).toBeNull();

    await unmount();
  });

  it("with contract counts (3 of 4 after a decline) the panel shows exactly the contract numbers", async () => {
    const { host, unmount } = await renderPanel({
      graphId: "seed-chanelle-juniper",
      graphName: "Juniper & Ivy",
      ledBy: "Chanelle",
      goingCount: 3,
      totalCount: 4,
      viewerState: "declined",
    });

    const count = host.querySelector('[data-testid="graph-convoy-going-count"]');
    expect(count?.textContent).toBe("3 of 4 going");
    expect(count?.getAttribute("data-viewer-state")).toBe("declined");
    expect(host.textContent).not.toMatch(/4 of 4/);

    await unmount();
  });

  it("partial contract counts render no count (both fields or nothing)", async () => {
    const { host, unmount } = await renderPanel({
      graphId: "seed-chanelle-juniper",
      graphName: "Juniper & Ivy",
      goingCount: 3,
    });
    expect(host.textContent).not.toMatch(/\d+ of \d+ going/);
    expect(host.querySelector('[data-testid="graph-convoy-going-count"]')).toBeNull();
    await unmount();
  });

  it("roster comes from contract participants when present - names only, no invented travel status", async () => {
    const { host, unmount } = await renderPanel({
      graphId: "plan-1",
      graphName: "Juniper & Ivy",
      goingCount: 3,
      totalCount: 4,
      participants: ["Chanelle", "Maya", "Jordan"],
    });

    const list = host.querySelector('[data-testid="graph-convoy-list"]');
    expect(list).toBeTruthy();
    expect(list?.textContent).toMatch(/Chanelle/);
    expect(list?.textContent).toMatch(/Maya/);
    expect(list?.textContent).toMatch(/Jordan/);
    // Names carry no fabricated convoy status lines.
    expect(list?.textContent).not.toMatch(/Arrived/);
    expect(list?.textContent).not.toMatch(/Not sharing location/);
    expect(list?.textContent).not.toMatch(/Not left yet/);
    expect(list?.textContent).not.toMatch(/min away/);
    // Fixture-only names are not added on top of the contract roster.
    expect(host.textContent).not.toMatch(/Sabrina/);
    expect(host.textContent).not.toMatch(/Alex/);

    await unmount();
  });

  it("source guard: the panel never imports the fixture roster or counts travel states", () => {
    const src = readFileSync(resolve(__dirname, "GraphConvoyPanel.tsx"), "utf8");
    expect(src).not.toMatch(/buildJuniperConvoyFixture/);
    expect(src).not.toMatch(/partySize/);
    expect(src).not.toMatch(/travelState !== "left"/);
    expect(src).not.toMatch(/FOUNDER_ORIGIN_FIXTURE/);
    expect(src).not.toMatch(/JUNIPER_VENUE/);
    expect(src).not.toMatch(/juniperReservationTonight/);
  });
});
