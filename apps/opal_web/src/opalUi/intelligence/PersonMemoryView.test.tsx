/**
 * PersonMemoryView — sections, correct/remove, empty state, mock client.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonMemoryView } from "./PersonMemoryView";
import {
  PERSON_MEMORY_MOCK,
  __resetIntelligenceMocks,
  type PersonMemoryView as PersonMemoryData,
} from "../../api/intelligenceClient";

const fetchPersonMemory = vi.fn(async () => ({ ...PERSON_MEMORY_MOCK }));
const patchPersonFact = vi.fn(async (_pid: string, key: string, value: string) => ({
  key,
  value,
  provenance: "stated" as const,
  source_note: "corrected by owner",
}));
const deletePersonFact = vi.fn(async () => ({ deleted: true }));

vi.mock("../../api/intelligenceClient", async () => {
  const actual = await vi.importActual<
    typeof import("../../api/intelligenceClient")
  >("../../api/intelligenceClient");
  return {
    ...actual,
    fetchPersonMemory: (...args: unknown[]) =>
      fetchPersonMemory(...(args as [never])),
    patchPersonFact: (...args: unknown[]) =>
      patchPersonFact(...(args as [never])),
    deletePersonFact: (...args: unknown[]) =>
      deletePersonFact(...(args as [never])),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  __resetIntelligenceMocks();
  fetchPersonMemory.mockReset().mockResolvedValue({
    ...PERSON_MEMORY_MOCK,
    known_facts: PERSON_MEMORY_MOCK.known_facts.map((f) => ({ ...f })),
  });
  patchPersonFact.mockClear();
  deletePersonFact.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("PersonMemoryView", () => {
  it("renders header and all sections", async () => {
    await act(async () => {
      root.render(
        <PersonMemoryView
          personId="person-maya"
          displayName="Maya"
          bearer="tok"
          onBack={() => {}}
        />,
      );
    });
    await flush();

    expect(container.querySelector('[data-testid="person-memory-view"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="person-memory-name"]')?.textContent,
    ).toBe("Maya");
    expect(container.querySelector('[data-testid="person-memory-knows"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="person-memory-rhythms"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="person-memory-dates"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="person-memory-loops"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="person-memory-learned"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="person-fact-provenance-birthday"]')
        ?.textContent,
    ).toMatch(/told Opal/i);
  });

  it("shows empty state for new person", async () => {
    const empty: PersonMemoryData = {
      person_id: "new",
      display_name: "New Friend",
      known_facts: [],
      rhythms: [],
      important_dates: [],
      open_loops: [],
      learned_preferences: [],
      _mock: true,
    };
    fetchPersonMemory.mockResolvedValueOnce(empty);
    await act(async () => {
      root.render(
        <PersonMemoryView
          personId="new"
          displayName="New Friend"
          bearer="tok"
          onBack={() => {}}
        />,
      );
    });
    await flush();
    expect(
      container.querySelector('[data-testid="person-memory-empty"]')?.textContent,
    ).toMatch(/doesn.t know much/i);
  });

  it("corrects a fact via PATCH mock", async () => {
    await act(async () => {
      root.render(
        <PersonMemoryView personId="person-maya" bearer="tok" onBack={() => {}} />,
      );
    });
    await flush();

    await act(async () => {
      (
        container.querySelector(
          '[data-testid="person-fact-correct-birthday"]',
        ) as HTMLButtonElement
      ).click();
    });
    const input = container.querySelector(
      '[data-testid="person-fact-edit-birthday"]',
    ) as HTMLInputElement;
    await act(async () => {
      const proto = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      );
      proto?.set?.call(input, "June 15");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      (
        container.querySelector(
          '[data-testid="person-fact-save-birthday"]',
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });
    expect(patchPersonFact).toHaveBeenCalledWith(
      "person-maya",
      "birthday",
      "June 15",
      expect.objectContaining({ bearer: "tok" }),
    );
  });

  it("removes a fact with confirmation — no bulk forget", async () => {
    await act(async () => {
      root.render(
        <PersonMemoryView personId="person-maya" bearer="tok" onBack={() => {}} />,
      );
    });
    await flush();

    expect(container.textContent).not.toMatch(/forget all/i);

    await act(async () => {
      (
        container.querySelector(
          '[data-testid="person-fact-remove-birthday"]',
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      (
        container.querySelector(
          '[data-testid="person-fact-confirm-remove-birthday"]',
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });
    expect(deletePersonFact).toHaveBeenCalledWith(
      "person-maya",
      "birthday",
      expect.objectContaining({ bearer: "tok" }),
    );
  });
});
