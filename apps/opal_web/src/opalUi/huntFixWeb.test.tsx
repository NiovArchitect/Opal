/**
 * Repair #18 hunt-fix (web) — blind-spot Hunt B regression tests.
 *
 * Each test pins one hunt find's honest end state: TRUE (real data)
 * or HONESTLY ABSENT/GATED (removed, or behind a truthful label /
 * empty state). Never a better-disguised fake.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CallContinuityDestination } from "./CallContinuityDestination";
import { NewCallDestination } from "./NewCallDestination";
import { CallSurface } from "./CallSurfaces";
import { SearchDestination } from "./SearchDestination";
import { TripCanvasView } from "./TripCanvasView";
import { CantMakeItSheet } from "./CantMakeItSheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container?.remove();
  container = null;
  window.history.replaceState({}, "", "/");
});

async function render(node: React.ReactNode) {
  await act(async () => {
    root!.render(node);
  });
}

const noop = () => {};

describe("B-02 Call Continuity — no fabricated history", () => {
  it("renders the honest empty line and no invented rows when no real history is passed", async () => {
    await render(
      <CallContinuityDestination
        kind="person"
        name="Riley"
        meta="Direct connection · calls"
        recent={[]}
        onBack={noop}
        onCall={noop}
        onVideo={noop}
        onChat={noop}
      />,
    );
    expect(container!.querySelector('[data-testid="call-cont-recent-empty"]')).toBeTruthy();
    expect(container!.textContent).toContain("No calls yet");
    expect(container!.textContent).not.toContain("12m ago");
    expect(container!.textContent).not.toContain("Missed audio");
    expect(container!.textContent).not.toContain("Yesterday · 36m");
  });

  it("renders real rows when the caller supplies them", async () => {
    await render(
      <CallContinuityDestination
        kind="group"
        name="Saturday Crew"
        meta="Group calls"
        recent={[{ id: "real-1", typeLabel: "Group audio", whenLabel: "Today · 9:02 AM" }]}
        onBack={noop}
        onCall={noop}
        onVideo={noop}
        onChat={noop}
      />,
    );
    expect(container!.querySelector('[data-testid="call-cont-recent-real-1"]')).toBeTruthy();
    expect(container!.textContent).toContain("Group audio");
    expect(container!.textContent).not.toContain("Missed group call · 28m ago");
  });
});

describe("B-03 New Call — no founder roster defaults", () => {
  it("renders honest empty states and no fixture people or groups", async () => {
    await render(
      <NewCallDestination
        onBack={noop}
        onCallPerson={noop}
        onCallGroup={noop}
        onOpenPersonContinuity={noop}
        onOpenGroupContinuity={noop}
      />,
    );
    expect(container!.querySelector('[data-testid="new-call-people-empty"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="new-call-groups-empty"]')).toBeTruthy();
    expect(container!.textContent).not.toContain("Chanelle");
    expect(container!.textContent).not.toContain("Juniper crew");
  });

  it("renders the account's real people when supplied", async () => {
    await render(
      <NewCallDestination
        onBack={noop}
        onCallPerson={noop}
        onCallGroup={noop}
        onOpenPersonContinuity={noop}
        onOpenGroupContinuity={noop}
        people={[{ id: "u-riley", name: "Riley", kind: "person" }]}
        groups={[]}
      />,
    );
    expect(container!.querySelector('[data-testid="new-call-person-riley"]')).toBeTruthy();
  });
});

describe("B-04 CallSurface — no painted stage without a live call", () => {
  it("renders the honest gate: no fake timer, no Guest participants, no Assist claim", async () => {
    await render(
      <CallSurface
        kind="video"
        direction="outgoing"
        peerName="Riley"
        onDecline={noop}
        onEnd={noop}
      />,
    );
    // CallSurface portals to document.body.
    expect(document.body.querySelector('[data-testid="call-unavailable"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain("00:12");
    expect(document.body.textContent).not.toContain("Guest 1");
    expect(document.body.textContent).not.toContain("preference on");
  });
});

describe("B-01 legacy Search — fixtures never present as the user's world", () => {
  it("real accounts get the honest empty state and no fixture results", async () => {
    await render(<SearchDestination onBack={noop} />);
    expect(container!.querySelector('[data-testid="search-honest-empty"]')).toBeTruthy();
    expect(container!.textContent).not.toContain("Juniper & Ivy");
    expect(container!.textContent).not.toContain("Chanelle");
  });

  it("demo mode shows the fixtures only under a visible Sample banner", async () => {
    await render(<SearchDestination onBack={noop} demoMode />);
    expect(container!.querySelector('[data-testid="search-demo-banner"]')).toBeTruthy();
    expect(container!.textContent).toContain("Sample data");
    expect(container!.querySelector('[data-testid="search-honest-empty"]')).toBeNull();
  });
});

describe("B-09 Trip canvas — seed id outside seed mode is honestly absent", () => {
  it("renders the absent state, never the Mexico City fixture", async () => {
    await render(
      <TripCanvasView tripId="seed-trip-mexico-city" bearer={null} onClose={noop} />,
    );
    await act(async () => {});
    expect(container!.querySelector('[data-testid="trip-canvas-absent"]')).toBeTruthy();
    expect(container!.textContent).not.toContain("Mexico City");
  });
});

describe("B-15 CantMakeItSheet — continuation + surfaced failures", () => {
  it("offers Ask to move this online and shows the failure line", async () => {
    const onMoveOnline = vi.fn();
    await render(
      <CantMakeItSheet
        place="Juniper & Ivy"
        whenLabel="Saturday"
        onBack={noop}
        onConfirm={noop}
        onMoveOnline={onMoveOnline}
        error="That didn't go through. Check your connection and try again."
      />,
    );
    const btn = container!.querySelector<HTMLButtonElement>(
      '[data-testid="cant-make-it-move-online"]',
    );
    expect(btn).toBeTruthy();
    await act(async () => {
      btn!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(onMoveOnline).toHaveBeenCalledTimes(1);
    expect(container!.querySelector('[data-testid="cant-make-it-error"]')?.textContent).toContain(
      "didn't go through",
    );
  });

  it("without a wired conversion the move-online control does not render", async () => {
    await render(
      <CantMakeItSheet place="Somewhere" whenLabel="Soon" onBack={noop} onConfirm={noop} />,
    );
    expect(container!.querySelector('[data-testid="cant-make-it-move-online"]')).toBeNull();
  });
});
