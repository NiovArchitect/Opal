/**
 * Phase 7A — What Opal remembers (You hub memory transparency).
 * No @testing-library: createRoot + jsdom (project convention).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatOpalRemembersSection } from "./YouSettingsDestination";
import type { MemoryFact, ProductSession } from "../api/productClient";

const sampleFacts: MemoryFact[] = [
  { id: "f1", label: "Prefers Italian food", value: "taste:cuisine:italian", mapped: true },
  { id: "f2", label: "quiet restaurants", value: "quiet restaurants", mapped: false },
];

const listMemoryFacts = vi.fn(async () => ({ facts: sampleFacts }));
const forgetMemoryFact = vi.fn(async (id: string) => ({
  fact: sampleFacts.find((f) => f.id === id) || sampleFacts[0],
  forgotten: true,
  candidates_removed: 1,
  candidate_cleanup: "promoted_memory_id_and_value_key_match",
}));

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    listMemoryFacts: (...args: unknown[]) => listMemoryFacts(...args),
    forgetMemoryFact: (...args: unknown[]) => forgetMemoryFact(...(args as [never])),
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

const session: ProductSession = {
  user_id: "u-a",
  display_name: "Alex",
  access_token: "tok-a",
};

beforeEach(() => {
  vi.useFakeTimers();
  listMemoryFacts.mockReset().mockResolvedValue({ facts: [...sampleFacts] });
  forgetMemoryFact.mockReset().mockImplementation(async (id: string) => ({
    fact: sampleFacts.find((f) => f.id === id) || sampleFacts[0],
    forgotten: true,
    candidates_removed: 1,
  }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("WhatOpalRemembersSection", () => {
  it("renders fact rows with labels", async () => {
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="what-opal-remembers"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="memory-fact-label-f1"]')?.textContent).toBe(
      "Prefers Italian food",
    );
    expect(container.querySelector('[data-testid="memory-fact-label-f2"]')?.textContent).toBe(
      "quiet restaurants",
    );
    expect(container.querySelector('[data-testid="memory-empty"]')).toBeNull();
  });

  it("shows empty state when no facts", async () => {
    listMemoryFacts.mockResolvedValue({ facts: [] });
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    const empty = container.querySelector('[data-testid="memory-empty"]');
    expect(empty?.textContent).toMatch(/doesn.t remember anything yet/i);
  });

  it("Forget deletes and removes the row", async () => {
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    const btn = container.querySelector('[data-testid="memory-forget-f1"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    await act(async () => {
      btn.click();
    });
    await flush();

    expect(forgetMemoryFact).toHaveBeenCalledWith("f1", "tok-a");

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    await flush();

    expect(container.querySelector('[data-testid="memory-fact-row-f1"]')).toBeNull();
    expect(container.querySelector('[data-testid="memory-fact-row-f2"]')).toBeTruthy();
  });
});
