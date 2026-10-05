/**
 * Phase 10A — Celebrations (You hub, below What Opal remembers).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CelebrationsSection } from "./YouSettingsDestination";
import type { Celebration, ProductSession } from "../api/productClient";

const sample: Celebration[] = [
  {
    id: "c1",
    user_id: "u-a",
    person_name: "Maya",
    kind: "birthday",
    month: 6,
    day: 15,
    year: null,
    date_label: "Jun 15",
    would_love: "Quiet Italian dinner for two",
  },
];

const listCelebrations = vi.fn(async () => ({ celebrations: sample }));
const createCelebration = vi.fn(async (attrs: Partial<Celebration>) => ({
  celebration: {
    id: "c-new",
    user_id: "u-a",
    person_name: attrs.person_name || "New",
    kind: attrs.kind || "birthday",
    month: attrs.month || 1,
    day: attrs.day || 1,
    year: attrs.year ?? null,
    date_label: "Jan 1",
  } as Celebration,
}));
const deleteCelebration = vi.fn(async (id: string) => ({
  celebration: sample.find((c) => c.id === id) || sample[0],
  deleted: true,
}));
const curateCelebration = vi.fn(async () => ({
  curation: {
    mode: "full",
    celebration: { name: "Maya's birthday", days_until: 14 },
    gift_ideas: ["A cozy experience for two", "A Italian cooking class"],
    plan_ideas: ["Quiet Italian dinner for two", "Spa day"],
    shared_history: [{ plan_title: "Fort Oak dinner", vibe: "quiet", cuisine: "italian" }],
    budget_note: "Fits your moderate comfort.",
  },
}));
const postOpalMessage = vi.fn(async () => ({ messages: [] }));

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    listCelebrations: (...args: unknown[]) => listCelebrations(...args),
    createCelebration: (...args: unknown[]) =>
      createCelebration(...(args as [never])),
    deleteCelebration: (...args: unknown[]) =>
      deleteCelebration(...(args as [never])),
    curateCelebration: (...args: unknown[]) =>
      curateCelebration(...(args as [never])),
    postOpalMessage: (...args: unknown[]) => postOpalMessage(...(args as [never])),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setInput(el: HTMLInputElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const session: ProductSession = {
  user_id: "u-a",
  display_name: "Alex",
  access_token: "tok-a",
};

beforeEach(() => {
  listCelebrations.mockReset().mockResolvedValue({ celebrations: [...sample] });
  createCelebration.mockClear();
  deleteCelebration.mockClear();
  curateCelebration.mockClear();
  postOpalMessage.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("CelebrationsSection", () => {
  it("renders list rows with name and date", async () => {
    await act(async () => {
      root.render(<CelebrationsSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="celebrations-section"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="celebration-name-c1"]')?.textContent).toBe(
      "Maya",
    );
    expect(container.querySelector('[data-testid="celebration-date-c1"]')?.textContent).toBe(
      "Jun 15",
    );
    expect(container.querySelector('[data-testid="celebrations-empty"]')).toBeNull();
  });

  it("shows empty state when none", async () => {
    listCelebrations.mockResolvedValue({ celebrations: [] });
    await act(async () => {
      root.render(<CelebrationsSection session={session} />);
    });
    await flush();

    const empty = container.querySelector('[data-testid="celebrations-empty"]');
    expect(empty?.textContent).toMatch(/remind you in time/i);
  });

  it("Add form saves a celebration", async () => {
    listCelebrations
      .mockResolvedValueOnce({ celebrations: [] })
      .mockResolvedValueOnce({
        celebrations: [
          {
            id: "c-new",
            user_id: "u-a",
            person_name: "Sam",
            kind: "anniversary",
            month: 3,
            day: 4,
            date_label: "Mar 4",
          },
        ],
      });

    await act(async () => {
      root.render(<CelebrationsSection session={session} />);
    });
    await flush();

    const addBtn = container.querySelector(
      '[data-testid="celebrations-add"]',
    ) as HTMLButtonElement;
    await act(async () => {
      addBtn.click();
    });
    await flush();

    expect(container.querySelector('[data-testid="celebrations-form"]')).toBeTruthy();

    const name = container.querySelector(
      '[data-testid="celebrations-name"]',
    ) as HTMLInputElement;
    await act(async () => {
      setInput(name, "Sam");
    });
    await flush();

    await act(async () => {
      (
        container.querySelector(
          '[data-testid="celebrations-kind-anniversary"]',
        ) as HTMLButtonElement
      ).click();
    });
    await flush();

    await act(async () => {
      (container.querySelector('[data-testid="celebrations-save"]') as HTMLButtonElement).click();
    });
    await flush();

    expect(createCelebration).toHaveBeenCalled();
    const args = createCelebration.mock.calls[0][0] as {
      person_name: string;
      kind: string;
    };
    expect(args.person_name).toBe("Sam");
    expect(args.kind).toBe("anniversary");
  });

  it("Delete removes a row", async () => {
    await act(async () => {
      root.render(<CelebrationsSection session={session} />);
    });
    await flush();

    const btn = container.querySelector(
      '[data-testid="celebration-delete-c1"]',
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    await flush();

    expect(deleteCelebration).toHaveBeenCalledWith("c1", "tok-a");
    expect(container.querySelector('[data-testid="celebration-row-c1"]')).toBeNull();
  });

  it("D-2 shows would-love hint and opens curation detail with Plan this", async () => {
    await act(async () => {
      root.render(<CelebrationsSection session={session} />);
    });
    await flush();

    expect(
      container.querySelector('[data-testid="celebration-would-love-c1"]')?.textContent,
    ).toMatch(/Maya would love/i);
    expect(
      container.querySelector('[data-testid="celebration-would-love-c1"]')?.textContent,
    ).toMatch(/Quiet Italian dinner/i);

    const openBtn = container.querySelector(
      '[data-testid="celebration-open-c1"]',
    ) as HTMLButtonElement;
    await act(async () => {
      openBtn.click();
    });
    await flush();
    await flush();

    expect(curateCelebration).toHaveBeenCalledWith("c1", "tok-a");
    expect(container.querySelector('[data-testid="celebration-detail-c1"]')).toBeTruthy();
    expect(container.textContent).toMatch(/What would make Maya/);
    expect(container.querySelector('[data-testid="celebration-gifts-c1"]')).toBeTruthy();

    const planBtn = container.querySelector(
      '[data-testid="celebration-plan-c1"]',
    ) as HTMLButtonElement;
    await act(async () => {
      planBtn.click();
    });
    await flush();

    expect(postOpalMessage).toHaveBeenCalled();
    const msg = postOpalMessage.mock.calls[0][0] as string;
    expect(msg).toMatch(/Plan Quiet Italian dinner/i);
    expect(msg).toMatch(/Maya's birthday/);
    expect(
      container.querySelector('[data-testid="celebration-plan-note-c1"]')?.textContent,
    ).toMatch(/Asked Opal/i);
  });
});
