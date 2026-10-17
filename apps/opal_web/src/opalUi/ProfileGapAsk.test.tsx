/**
 * Repair #16 W3 — progressive profile ask surface contract (Repair #15 B6).
 *
 * The QUIET law as UI behavior:
 *  - assess "ask" → the payload renders IN-FLOW (a card, not a modal):
 *    prompt naming the person, a date input, a Skip control carrying
 *    the payload's skip label, non-blocking.
 *  - Answer completes the flow (card resolves, answer endpoint hit).
 *  - Skip completes the flow (card resolves, skip endpoint hit).
 *  - Dismiss completes the flow WITHOUT any endpoint call (the ledger
 *    already recorded the ask; dismiss is not a skip).
 *  - assess "known" / "proceed_without" → renders NOTHING.
 *  - Assess fires exactly once per person, even across re-renders.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileGapAsk } from "./ProfileGapAsk";

const assessProfileGap = vi.fn();
const answerProfileGap = vi.fn();
const skipProfileGap = vi.fn();

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    assessProfileGap: (...args: unknown[]) => assessProfileGap(...args),
    answerProfileGap: (...args: unknown[]) => answerProfileGap(...args),
    skipProfileGap: (...args: unknown[]) => skipProfileGap(...args),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ASK_RESULT = {
  profile_gap: {
    status: "ask",
    value: null,
    plan_proceeds: true,
    ask: {
      fact_key: "birthday",
      prompt:
        "Quick one while we plan — when's Maya's birthday? I'll remember it so next year just works. Skip is totally fine.",
      flow: "birthday_plan",
      blocking: false,
      dismissible: true,
      skip_label: "Skip",
      asked_once: true,
    },
  },
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

function setInput(el: HTMLInputElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  assessProfileGap.mockReset().mockResolvedValue(ASK_RESULT);
  answerProfileGap.mockReset().mockResolvedValue({ answered: true, fact_key: "birthday", value: "2014-03-05" });
  skipProfileGap.mockReset().mockResolvedValue({ skipped: true, fact_key: "birthday", status: "proceed_without" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ProfileGapAsk", () => {
  it("ask renders in-flow: prompt naming the person, date input, Skip with the payload label, non-blocking", async () => {
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    const card = q("profile-gap-ask");
    expect(card).not.toBeNull();
    // In-flow card, not a modal dialog, and explicitly non-blocking.
    expect(card?.getAttribute("role")).toBe("note");
    expect(card?.getAttribute("data-blocking")).toBe("false");
    expect(q("profile-gap-ask-prompt")?.textContent).toContain("Maya's birthday");
    expect(q("profile-gap-ask-input")).not.toBeNull();
    expect(q("profile-gap-ask-skip")?.textContent).toBe("Skip");
    expect(q("profile-gap-ask-dismiss")).not.toBeNull();
    expect(assessProfileGap).toHaveBeenCalledTimes(1);
    expect(assessProfileGap).toHaveBeenCalledWith("person-1", "Maya", "tok");
  });

  it("answer completes the flow: answer endpoint called with the date, card resolves", async () => {
    const onResolved = vi.fn();
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" onResolved={onResolved} />);
    await flush();

    setInput(q("profile-gap-ask-input") as HTMLInputElement, "2014-03-05");
    click(q("profile-gap-ask-answer")!);
    await flush();

    expect(answerProfileGap).toHaveBeenCalledWith("person-1", "2014-03-05", "Maya", "tok");
    expect(q("profile-gap-ask")).toBeNull();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it("server-rejected answer keeps the card open with an error (nothing pretends to be stored)", async () => {
    // The backend 422s invalid dates and stores nothing; the surface
    // must keep the card open for a correction or a Skip — no fake save.
    answerProfileGap.mockReset().mockRejectedValue(new Error("422 invalid"));
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    setInput(q("profile-gap-ask-input") as HTMLInputElement, "2014-03-05");
    click(q("profile-gap-ask-answer")!);
    await flush();

    expect(answerProfileGap).toHaveBeenCalledWith("person-1", "2014-03-05", "Maya", "tok");
    expect(q("profile-gap-ask")).not.toBeNull();
    expect(q("profile-gap-ask-error")?.textContent).toContain("doesn't work");
  });

  it("empty answer does not call the endpoint; it points at Skip instead", async () => {
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    click(q("profile-gap-ask-answer")!);
    await flush();

    expect(answerProfileGap).not.toHaveBeenCalled();
    expect(q("profile-gap-ask-error")?.textContent).toContain("Skip");
    expect(q("profile-gap-ask")).not.toBeNull();
  });

  it("skip completes the flow: skip endpoint called, card resolves", async () => {
    const onResolved = vi.fn();
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" onResolved={onResolved} />);
    await flush();

    click(q("profile-gap-ask-skip")!);
    await flush();

    expect(skipProfileGap).toHaveBeenCalledWith("person-1", "tok");
    expect(q("profile-gap-ask")).toBeNull();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it("dismiss completes the flow with NO endpoint call (dismiss is not a skip)", async () => {
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    click(q("profile-gap-ask-dismiss")!);
    await flush();

    expect(q("profile-gap-ask")).toBeNull();
    expect(skipProfileGap).not.toHaveBeenCalled();
    expect(answerProfileGap).not.toHaveBeenCalled();
  });

  it("known renders nothing", async () => {
    assessProfileGap.mockReset().mockResolvedValue({
      profile_gap: { status: "known", value: "2014-03-05", ask: null, plan_proceeds: true },
    });
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    expect(q("profile-gap-ask")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("proceed_without (already asked / skipped) renders nothing", async () => {
    assessProfileGap.mockReset().mockResolvedValue({
      profile_gap: { status: "proceed_without", value: null, ask: null, reason: "skipped", plan_proceeds: true },
    });
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    expect(q("profile-gap-ask")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("assess failure renders nothing (a failed ask is never a wall)", async () => {
    assessProfileGap.mockReset().mockRejectedValue(new Error("network"));
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    expect(q("profile-gap-ask")).toBeNull();
  });

  it("assesses exactly once per person across re-renders (no UI-invented re-ask)", async () => {
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();
    render(<ProfileGapAsk personId="person-1" personName="Maya" bearer="tok" />);
    await flush();

    expect(assessProfileGap).toHaveBeenCalledTimes(1);
    expect(q("profile-gap-ask")).not.toBeNull();
  });
});
