/**
 * @vitest-environment jsdom
 *
 * Repair #19 W20 (JA-09) — location-share copy pinned to behavior.
 *
 * The behavior (the code's actual lifecycle): sharing posts ONE
 * device fix (getDeviceCoords → a single sharePlanLocation POST);
 * there is no watchPosition anywhere in the web source, so the
 * position never follows the user. The share RECORD lives until
 * the user stops it or its real 4-hour server expiry passes
 * (PlanLocationShare's share window). The old copy — "You are
 * sharing your location for this plan for the next 4 hours" —
 * wore the record's lifetime as if it were 4 hours of live
 * sharing. The copy now states the snapshot truth, and this test
 * pins copy to behavior: if a watch/interval refresh ever lands,
 * or the copy drifts back, this test fails.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { C2GraphDetail } from "./C2Graphs";
import type { GraphDetailProjection } from "./projections";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
});

const detail = (): GraphDetailProjection => ({
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
  who: [
    {
      name: "Maya",
      avatar: { initials: "M", tint: 1 },
      responseLabel: "Going",
      locationLabel: "Not sharing location",
      locationState: "not_sharing",
    },
  ],
  activity: [],
  history: [],
  origin: "graphs",
});

const baseEvents = {
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
};

describe("JA-09 — location share copy states the snapshot truth", () => {
  it("the explainer is on glass in plain words - no (i) bubble (W28-5)", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <C2GraphDetail
          detail={detail()}
          events={{
            ...baseEvents,
            shareMyLocation: vi.fn(async () => ""),
            stopMyLocation: vi.fn(async () => ""),
          }}
        />,
      );
    });
    const block = document.querySelector('[data-testid="c2-detail-share-location"]');
    expect(block).toBeTruthy();
    // Repair #28 (W28-5, founder walk #6 - reverses R21 W-3's
    // bubble): what is shared and who sees it is stated beside the
    // control, in the open. The JA-09 honest wording is unchanged.
    expect(block!.querySelector('[data-testid="calm-info"]')).toBeNull();
    expect(block!.textContent).toContain("a snapshot, not live tracking");
    expect(block!.textContent).toContain("Only people on this plan see it");
    expect(block!.textContent).toContain("until you stop sharing or 4 hours pass");
    expect(block!.textContent).not.toContain("next 4 hours");
    // Not sharing: Share is offered, Stop is NOT (one state, one
    // control that matches it - the walk #6 contradiction).
    expect(block!.querySelector('[data-testid="c2-detail-share-location-btn"]')).toBeTruthy();
    expect(block!.querySelector('[data-testid="c2-detail-stop-location-btn"]')).toBeNull();
  });

  it("sharing: the state line shows and only Stop is offered (W28-5)", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const sharing = detail();
    sharing.viewerUserId = "u-viewer";
    sharing.who = [
      {
        userId: "u-viewer",
        name: "Sadeil",
        avatar: { initials: "S", tint: 2 },
        responseLabel: "Going",
        locationLabel: "Sharing location - 2 mi from the place",
        locationState: "sharing",
      },
      ...sharing.who,
    ] as GraphDetailProjection["who"];
    await act(async () => {
      root!.render(
        <C2GraphDetail
          detail={sharing}
          events={{
            ...baseEvents,
            shareMyLocation: vi.fn(async () => ""),
            stopMyLocation: vi.fn(async () => ""),
          }}
        />,
      );
    });
    const block = document.querySelector('[data-testid="c2-detail-share-location"]');
    expect(block).toBeTruthy();
    expect(block!.querySelector('[data-testid="c2-detail-sharing-state"]')?.textContent).toContain(
      "You are sharing your location for this plan",
    );
    expect(block!.querySelector('[data-testid="c2-detail-stop-location-btn"]')).toBeTruthy();
    expect(block!.querySelector('[data-testid="c2-detail-share-location-btn"]')).toBeNull();
  });

  it("copy is pinned to the behavior in source: one fix, no watch, honest success line", () => {
    const shell = readFileSync(resolve(__dirname, "./C2Shell.tsx"), "utf8");
    expect(shell).toContain("one-time snapshot, not live tracking");
    expect(shell).toContain("until you stop it or 4 hours pass");
    expect(shell).not.toContain("for the next 4 hours");

    // The behavior the copy claims: the share path takes a single
    // fix and posts it once — no watchPosition in the device
    // location module or the shell's share handler.
    const device = readFileSync(
      resolve(__dirname, "../../device/deviceLocation.ts"),
      "utf8",
    );
    expect(device).not.toContain("watchPosition");
    expect(shell).not.toContain("watchPosition");
    expect(device).toContain("getCurrentPosition");
  });
});
