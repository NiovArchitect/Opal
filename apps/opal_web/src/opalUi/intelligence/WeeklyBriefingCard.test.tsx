import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyBriefingCard } from "./WeeklyBriefingCard";
import {
  WEEKLY_BRIEFING_MOCK,
  WEEKLY_BRIEFING_PAST_MOCK,
} from "../../api/intelligenceClient";

const dismissBriefing = vi.fn(async () => ({ ok: true, _mock: true }));
const fetchPastBriefings = vi.fn(async () => [...WEEKLY_BRIEFING_PAST_MOCK]);
const postOpalMessage = vi.fn(async () => ({ messages: [] }));

vi.mock("../../api/intelligenceClient", async () => {
  const actual = await vi.importActual<
    typeof import("../../api/intelligenceClient")
  >("../../api/intelligenceClient");
  return {
    ...actual,
    dismissBriefing: (...args: unknown[]) =>
      dismissBriefing(...(args as [never])),
    fetchPastBriefings: (...args: unknown[]) =>
      fetchPastBriefings(...(args as [never])),
  };
});

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    postOpalMessage: (...args: unknown[]) =>
      postOpalMessage(...(args as [never])),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  dismissBriefing.mockClear();
  fetchPastBriefings.mockClear();
  postOpalMessage.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("WeeklyBriefingCard", () => {
  it("renders sections from payload", async () => {
    const b = WEEKLY_BRIEFING_MOCK;
    await act(async () => {
      root.render(<WeeklyBriefingCard briefing={b} bearer="tok" />);
    });
    expect(
      container.querySelector(`[data-testid="briefing-header-${b.id}"]`)
        ?.textContent,
    ).toBe(b.header);
    expect(
      container.querySelector(`[data-testid="briefing-confirmed-${b.id}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-testid="briefing-open-${b.id}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-testid="briefing-question-${b.id}"]`)
        ?.textContent,
    ).toBe(b.question?.label);
  });

  it("question deep-link posts plan_create prefill", async () => {
    const b = WEEKLY_BRIEFING_MOCK;
    await act(async () => {
      root.render(<WeeklyBriefingCard briefing={b} bearer="tok" />);
    });
    await act(async () => {
      (
        container.querySelector(
          `[data-testid="briefing-question-${b.id}"]`,
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });
    expect(postOpalMessage).toHaveBeenCalled();
  });

  it("past weeks + dismiss-for-week", async () => {
    const b = WEEKLY_BRIEFING_MOCK;
    const onDismissed = vi.fn();
    await act(async () => {
      root.render(
        <WeeklyBriefingCard
          briefing={b}
          bearer="tok"
          onDismissed={onDismissed}
        />,
      );
    });
    await act(async () => {
      (
        container.querySelector(
          `[data-testid="briefing-past-${b.id}"]`,
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });
    expect(fetchPastBriefings).toHaveBeenCalled();
    expect(
      container.querySelector(`[data-testid="briefing-past-list-${b.id}"]`),
    ).toBeTruthy();

    await act(async () => {
      (
        container.querySelector(
          `[data-testid="briefing-dismiss-${b.id}"]`,
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });
    expect(dismissBriefing).toHaveBeenCalledWith(b.id, { bearer: "tok" });
    expect(onDismissed).toHaveBeenCalledWith(b.id);
  });
});
