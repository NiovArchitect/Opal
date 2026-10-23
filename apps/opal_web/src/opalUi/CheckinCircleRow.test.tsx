/**
 * Repair #18 B3 — CheckinCircleRow contract.
 *
 * - No sweep: the start action creates through POST /checkins.
 * - Open sweep: renders the server headline from the projection.
 * - Cooldown: the start action is DISABLED from the contract's
 *   next_sweep_allowed_at - the user never taps into an error.
 * - Suggestion: renders the server copy; dismiss hits the dismissal
 *   endpoint (permanent server-side) and hides the suggestion.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckinCircleRow } from "./CheckinCircleRow";

const getCheckinForSource = vi.fn();
const createCheckin = vi.fn();
const dismissCheckinSuggestion = vi.fn();

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    getCheckinForSource: (...args: unknown[]) => getCheckinForSource(...args),
    createCheckin: (...args: unknown[]) => createCheckin(...args),
    dismissCheckinSuggestion: (...args: unknown[]) => dismissCheckinSuggestion(...args),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SOURCE = { source_kind: "conversation" as const, source_ref_id: "conv-1" };

const OPEN_SWEEP = {
  checkin: {
    view: "organizer",
    sweep: {
      id: "sweep-1",
      source_kind: "conversation",
      source_ref_id: "conv-1",
      source_fallback: null,
      circle_label: "Saturday Crew",
      status: "open",
      prompt_theme: null,
      created_at: "2026-10-17T00:00:00Z",
      expires_at: "2026-10-19T00:00:00Z",
      closed_at: null,
      close_reason: null,
      next_sweep_allowed_at: null,
    },
    counts: { asked_total: 3, answered: 1, declined_or_passed: 0, withdrawn: 0, not_ok: 0, still_waiting: 2, not_askable: 0 },
    members: [],
    not_askable_names: [],
    not_askable_note: null,
    minor_note: null,
    copy: { headline: "1 of 3 answered", still_waiting_line: "Still waiting on: Ben, Cid. Not answering is not the same as being okay." },
  },
  suggestion: null,
  next_sweep_allowed_at: null,
};

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  getCheckinForSource.mockReset();
  createCheckin.mockReset();
  dismissCheckinSuggestion.mockReset().mockResolvedValue({ dismissed: true });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("CheckinCircleRow", () => {
  it("no sweep: start action creates through the one creation path", async () => {
    getCheckinForSource.mockResolvedValue({ checkin: null, suggestion: null, next_sweep_allowed_at: null });
    createCheckin.mockResolvedValue(OPEN_SWEEP);
    act(() => root.render(<CheckinCircleRow source={SOURCE} bearer="tok" />));
    await flush();

    click(q("checkin-circle-start")!);
    await flush();
    expect(createCheckin).toHaveBeenCalled();
    expect(q("checkin-circle-summary")?.textContent).toContain("1 of 3 answered");
  });

  it("open sweep renders the server headline, not a local derivation", async () => {
    getCheckinForSource.mockResolvedValue(OPEN_SWEEP);
    act(() => root.render(<CheckinCircleRow source={SOURCE} bearer="tok" />));
    await flush();
    // Repair #28 (W28-3): the card states the tally ONCE - the
    // headline alone, no second span repeating still-waiting /
    // need-something counts (the run-together garble's source).
    expect(q("checkin-circle-summary")?.textContent).toBe("1 of 3 answered");
    expect(q("checkin-circle-start")).toBeNull();
  });

  it("cooldown disables the action from the contract field", async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    getCheckinForSource.mockResolvedValue({
      checkin: {
        ...OPEN_SWEEP.checkin,
        sweep: { ...OPEN_SWEEP.checkin.sweep, status: "closed", next_sweep_allowed_at: future },
      },
      suggestion: null,
      next_sweep_allowed_at: future,
    });
    act(() => root.render(<CheckinCircleRow source={SOURCE} bearer="tok" />));
    await flush();
    const start = q("checkin-circle-start") as HTMLButtonElement | null;
    expect(start).not.toBeNull();
    expect(start?.disabled).toBe(true);
    expect(q("checkin-circle-cooldown")).not.toBeNull();
  });

  it("suggestion renders server copy; dismiss records and hides it", async () => {
    getCheckinForSource.mockResolvedValue({
      checkin: null,
      suggestion: {
        kind: "checkin_sweep",
        circle_key: "conversation:conv-1",
        copy: "Plans changed for this circle recently. You can ask Opal to check in with everyone - answers come back to you privately.",
        action_label: "Check in with everyone",
        dismissible: true,
      },
      next_sweep_allowed_at: null,
    });
    act(() => root.render(<CheckinCircleRow source={SOURCE} bearer="tok" />));
    await flush();
    expect(q("checkin-suggestion")?.textContent).toContain("answers come back to you privately");
    click(q("checkin-suggestion-dismiss")!);
    await flush();
    expect(dismissCheckinSuggestion).toHaveBeenCalledWith(SOURCE, "tok");
    expect(q("checkin-suggestion")).toBeNull();
  });
});
