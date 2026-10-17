/**
 * @vitest-environment jsdom
 *
 * Repair #18 (F18-01) - GraphDetailSheet attendance.
 * The fixture branch (seed-chanelle-juniper, no backend contract behind
 * it) must render NO going count and NO convoy roster: before this
 * repair its GraphConvoyPanel counted a fixture roster and always read
 * "4 of 4 going". The canonical branch renders exactly the contract
 * counts on the projection (goingCount / totalCount / viewerState).
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { GraphDetailSheet } from "./GraphDetailSheet";
import type { CanonicalGraph } from "./graphReality";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderSheet(element: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(element);
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

const CONTRACT_GRAPH: CanonicalGraph = {
  planId: "plan-juniper-contract",
  conversationId: "plan-juniper-contract",
  title: "Juniper & Ivy",
  activity: "dinner",
  whenLabel: "Saturday · 7:30 PM",
  dayLabel: "Saturday",
  timeLabel: "7:30 PM",
  timezone: "America/Los_Angeles",
  participants: ["Sadeil", "Chanelle", "Maya", "Jordan"],
  state: "ready",
  temporalState: null,
  executionLabel: null,
  executionDetail: null,
  place: {
    name: "Juniper & Ivy",
    area: "Little Italy",
    placeId: null,
    address: null,
    coordinates: null,
    provenance: null,
  },
  travel: {
    distance: null,
    travelMinutes: null,
    leaveBy: null,
    trafficAware: false,
    provider: null,
    updatedAt: null,
    message: "Travel time unavailable",
    detail: "This place has no coordinates yet, so distance and leave-by stay off.",
  },
  directionsQuery: "Juniper & Ivy, Little Italy",
  goingCount: 3,
  totalCount: 4,
  viewerState: "declined",
  conflict: null,
};

describe("GraphDetailSheet attendance (Repair #18, F18-01)", () => {
  it("fixture branch: the Juniper fixture renders no count and no fixture roster", async () => {
    const { host, unmount } = await renderSheet(
      <GraphDetailSheet cardId="seed-chanelle-juniper" onClose={() => {}} />,
    );

    expect(host.querySelector('[data-testid="graph-detail-sheet"]')).toBeTruthy();
    // No invented attendance anywhere on the sheet.
    expect(host.textContent).not.toMatch(/4 of 4/);
    expect(host.textContent).not.toMatch(/\d+ of \d+ going/);
    expect(host.querySelector('[data-testid="graph-detail-attendance"]')).toBeNull();
    expect(host.querySelector('[data-testid="graph-convoy-going-count"]')).toBeNull();
    // No fixture roster: the panel renders no convoy list and none of the
    // fixture member rows (Jordan / Sabrina / Alex travel theater).
    expect(host.querySelector('[data-testid="graph-convoy-list"]')).toBeNull();
    expect(host.querySelector('[data-testid^="graph-convoy-row-"]')).toBeNull();
    expect(host.textContent).not.toMatch(/Sabrina/);

    await unmount();
  });

  it("canonical branch: with contract counts (3 of 4 after a decline) the sheet shows exactly the contract numbers", async () => {
    const { host, unmount } = await renderSheet(
      <GraphDetailSheet
        cardId="plan-juniper-contract"
        onClose={() => {}}
        reality={CONTRACT_GRAPH}
      />,
    );

    const attendance = host.querySelector('[data-testid="graph-detail-attendance"]');
    expect(attendance?.textContent).toContain("3 of 4 going");
    expect(attendance?.getAttribute("data-viewer-state")).toBe("declined");
    expect(host.textContent).not.toMatch(/4 of 4/);
    // The canonical branch never mounts the convoy fixture panel.
    expect(host.querySelector('[data-testid="graph-convoy-panel"]')).toBeNull();

    await unmount();
  });

  it("canonical branch: absent contract counts render no attendance line", async () => {
    const noCounts: CanonicalGraph = {
      ...CONTRACT_GRAPH,
      goingCount: null,
      totalCount: null,
      viewerState: null,
    };
    const { host, unmount } = await renderSheet(
      <GraphDetailSheet
        cardId="plan-juniper-contract"
        onClose={() => {}}
        reality={noCounts}
      />,
    );

    expect(host.querySelector('[data-testid="graph-detail-attendance"]')).toBeNull();
    expect(host.textContent).not.toMatch(/\d+ of \d+ going/);

    await unmount();
  });
});
