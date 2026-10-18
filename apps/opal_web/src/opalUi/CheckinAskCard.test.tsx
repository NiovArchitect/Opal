/**
 * Repair #18 B3 — CheckinAskCard contract.
 *
 * - Renders ONLY the member_view projection: server ask copy stating
 *   answers go only to the organizer, the organizer theme verbatim,
 *   the three structured fields, share-area with its consent subcopy.
 * - Answer / decline / pass hit the respond endpoint with the exact
 *   payload shapes; the card resolves on success.
 * - A member who already answered re-opens in amend mode (update /
 *   withdraw reachable); declined / passed members see no card.
 * - Nothing about any other member is rendered (the projection has
 *   no such fields and the component invents none).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckinAskCard } from "./CheckinAskCard";

const getCheckin = vi.fn();
const respondCheckin = vi.fn();
const withdrawCheckin = vi.fn();

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    getCheckin: (...args: unknown[]) => getCheckin(...args),
    respondCheckin: (...args: unknown[]) => respondCheckin(...args),
    withdrawCheckin: (...args: unknown[]) => withdrawCheckin(...args),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MEMBER_VIEW = {
  checkin: {
    view: "member",
    sweep: {
      id: "sweep-1",
      source_kind: "relationship_set",
      source_ref_id: null,
      source_fallback: null,
      circle_label: "Family",
      status: "open",
      prompt_theme: "with the power out",
      created_at: "2026-10-17T00:00:00Z",
      expires_at: "2026-10-19T00:00:00Z",
      closed_at: null,
      close_reason: null,
      next_sweep_allowed_at: null,
    },
    organizer_name: "Olivia Organizer",
    ask: {
      title: "Quick check-in from Olivia",
      body: "Olivia asked Opal to check in with Family. Your answers go only to Olivia - nobody else in the group sees them. Answer what you want; skipping is completely fine.",
      theme_line: "They said: with the power out",
      organizer_name: "Olivia Organizer",
      circle_label: "Family",
      fields: {
        okay_label: "Are you okay?",
        where_label: "Where are you? (only if you want to say)",
        needs_label: "Do you need anything?",
        share_area_label: "Share my general area",
        share_area_subcopy:
          "Shares a rough area (about a city block or two) with Olivia only, just for this check-in. Opal never shares your location without this tap.",
        decline_label: "I would rather not answer",
      },
    },
    my_response: { status: "asked", okay: null, where_text: null, needs_text: null, free_text: null, shared_area: null, responded_at: null, updated_at: null },
    closed_copy: null,
  },
  view: "member",
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

function render(ui: React.ReactElement) {
  act(() => {
    root.render(ui);
  });
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function setInput(el: HTMLInputElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  getCheckin.mockReset().mockResolvedValue(MEMBER_VIEW);
  respondCheckin.mockReset().mockResolvedValue({ responded: true });
  withdrawCheckin.mockReset().mockResolvedValue({ withdrawn: true });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("CheckinAskCard", () => {
  it("renders the server ask copy, theme, fields and share consent line", async () => {
    render(<CheckinAskCard sweepId="sweep-1" bearer="tok" />);
    await flush();

    const card = q("checkin-ask-card");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("go only to Olivia");
    expect(card?.textContent).toContain("They said: with the power out");
    expect(card?.textContent).toContain("Are you okay?");
    expect(card?.textContent).toContain("Opal never shares your location without this tap.");
    expect(q("checkin-decline")?.textContent).toContain("I would rather not answer");
  });

  it("sends a structured answer with the exact payload and resolves", async () => {
    const onResolved = vi.fn();
    render(<CheckinAskCard sweepId="sweep-1" bearer="tok" onResolved={onResolved} />);
    await flush();

    click(q("checkin-not-okay")!);
    setInput(q("checkin-needs") as HTMLInputElement, "insulin is running low");
    click(q("checkin-send")!);
    await flush();

    expect(respondCheckin).toHaveBeenCalledWith(
      "sweep-1",
      { okay: "not_ok", needs_text: "insulin is running low" },
      "tok",
    );
    expect(onResolved).toHaveBeenCalled();
    expect(q("checkin-ask-card")).toBeNull();
  });

  it("decline sends only the decline flag - no content fields", async () => {
    render(<CheckinAskCard sweepId="sweep-1" bearer="tok" />);
    await flush();
    setInput(q("checkin-where") as HTMLInputElement, "somewhere private");
    click(q("checkin-decline")!);
    await flush();
    expect(respondCheckin).toHaveBeenCalledWith("sweep-1", { decline: true }, "tok");
  });

  it("an already-answered member re-opens in amend mode: prefilled, update and withdraw reachable (design 5.6)", async () => {
    getCheckin.mockResolvedValue({
      ...MEMBER_VIEW,
      checkin: {
        ...MEMBER_VIEW.checkin,
        my_response: {
          ...MEMBER_VIEW.checkin.my_response,
          status: "answered",
          okay: "ok",
          where_text: "home",
        },
      },
    });
    render(<CheckinAskCard sweepId="sweep-1" bearer="tok" />);
    await flush();
    expect(q("checkin-ask-card")).not.toBeNull();
    expect(q("checkin-amend-note")).not.toBeNull();
    expect((q("checkin-where") as HTMLInputElement).value).toBe("home");
    expect(q("checkin-decline")).toBeNull();

    click(q("checkin-withdraw")!);
    await flush();
    expect(withdrawCheckin).toHaveBeenCalledWith("sweep-1", "tok");
    expect(q("checkin-ask-card")).toBeNull();
  });

  it("renders nothing when the member already declined (a settled state)", async () => {
    getCheckin.mockResolvedValue({
      ...MEMBER_VIEW,
      checkin: {
        ...MEMBER_VIEW.checkin,
        my_response: { ...MEMBER_VIEW.checkin.my_response, status: "declined" },
      },
    });
    render(<CheckinAskCard sweepId="sweep-1" bearer="tok" />);
    await flush();
    expect(q("checkin-ask-card")).toBeNull();
  });
});
