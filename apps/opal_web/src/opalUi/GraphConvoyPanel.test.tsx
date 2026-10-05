/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { GraphConvoyPanel } from "./GraphConvoyPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("GraphConvoyPanel", () => {
  it("I'm on the way flips status and broadcasts", async () => {
    const onBroadcastArrival = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <GraphConvoyPanel
          graphId="seed-chanelle-juniper"
          graphName="Juniper & Ivy"
          onBroadcastArrival={onBroadcastArrival}
        />,
      );
    });

    expect(host.querySelector('[data-testid="graph-convoy-panel"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="graph-eta-section"]')?.textContent).toMatch(
      /geometric estimate/i,
    );
    expect(host.textContent).toMatch(/Not sharing location/);
    expect(host.textContent).toMatch(/of 4 going/);

    const btn = host.querySelector('[data-testid="graph-im-on-the-way"]') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(btn.getAttribute("data-travel-state")).toBe("on_the_way");
    expect(btn.textContent).toMatch(/On the way ✓/);
    expect(onBroadcastArrival).toHaveBeenCalledWith("on_the_way");

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
