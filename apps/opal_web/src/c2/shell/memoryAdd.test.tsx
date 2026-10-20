/**
 * N7 (founder polish wave) - What Opal remembers / Memory control:
 *  - the Memory room offers a manual add; a save goes through the
 *    real capsule create and the entry READS BACK from the wallet
 *    projection with its provenance ("You told Opal") and its saved
 *    date - nothing is painted locally;
 *  - an unwired host (no signed-in shell event) refuses honestly:
 *    the error line shows and no create is attempted;
 *  - the facts room states its own truth: Opal-derived facts are
 *    forget-only, and the fuller form lives in Memory (nav row);
 *  - the protection note is in the room: no password check exists
 *    to paint, and the copy says exactly why.
 * No @testing-library: createRoot + jsdom (project convention).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSoulMemory: vi.fn(),
  getGraphingPolicy: vi.fn(),
  listMemoryFacts: vi.fn(),
  createMemoryCapsule: vi.fn(),
}));

vi.mock("../../api/productClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/productClient")>();
  return {
    ...actual,
    getSoulMemory: mocks.getSoulMemory,
    getGraphingPolicy: mocks.getGraphingPolicy,
    listMemoryFacts: mocks.listMemoryFacts,
    createMemoryCapsule: mocks.createMemoryCapsule,
  };
});

import { C2SettingsSection, type C2YouEvents } from "./C2You";
import { buildSettingsSection } from "./shellData";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const baseEvents: C2YouEvents = {
  editProfile: vi.fn(),
  openSection: vi.fn(),
  backToHub: vi.fn(),
  setPreference: vi.fn(async () => undefined),
  applySoulGraphing: vi.fn(),
  applyQuietHours: vi.fn(),
  applyNotifications: vi.fn(async () => undefined),
  saveProfileFields: vi.fn(async () => undefined),
  submitSupportReport: vi.fn(async () => ({ reference: "r1" })),
  setModePreference: vi.fn(),
  modePreference: "system",
} as unknown as C2YouEvents;

function capsule(id: string, summary: string, createdAt: string) {
  return {
    id,
    source: "personal_memory",
    summary,
    provenance_label: "You told Opal",
    provenance: { source_label: "You told Opal", stored_at: createdAt },
    scope_policy: {},
    scope_kind: "user",
    purpose: "personal_memory",
    because: null,
    created_at: createdAt,
  };
}

let walletCapsules: ReturnType<typeof capsule>[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  walletCapsules = [capsule("cap-1", "Prefers window seats", "2026-10-10T10:00:00Z")];
  mocks.getSoulMemory.mockImplementation(async () => ({
    wallet: { id: "w1", owner_user_id: "me", created_at: null },
    soul: {},
    capsules: walletCapsules,
    capsule_count: walletCapsules.length,
  }));
  mocks.getGraphingPolicy.mockRejectedValue(new Error("no graphing read"));
  mocks.listMemoryFacts.mockResolvedValue({
    facts: [{ id: "f1", label: "Prefers Italian food", value: "Prefers Italian food" }],
  });
  mocks.createMemoryCapsule.mockImplementation(async (summary: string) => {
    const created = capsule("cap-new", summary, "2026-10-19T10:00:00Z");
    walletCapsules = [created, ...walletCapsules];
    return { capsule: created };
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

async function render(node: React.ReactNode) {
  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

describe("N7 - manual memory add with provenance + timestamp", () => {
  it("add persists through the capsule create and reads back with 'You told Opal' and its saved date", async () => {
    const events: C2YouEvents = {
      ...baseEvents,
      // The shell's wiring, in miniature: create, then re-read.
      addMemory: async (text: string) => {
        await mocks.createMemoryCapsule(text, "tok");
      },
    };
    let section = await buildSettingsSection("memory", { session: null, bearer: "tok" });
    await render(<C2SettingsSection section={section} events={events} />);
    expect(container.querySelector('[data-testid="c2-memory-add-form"]')).toBeTruthy();
    // The protection truth is in the room, in words.
    expect(container.textContent).toMatch(/no separate password check for memory yet/);
    expect(container.textContent).toMatch(/code sent to your phone/);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="c2-memory-add-input"]',
    )!;
    typeInto(input, "My daughter's recital is in June");
    const submit = container.querySelector<HTMLButtonElement>(
      '[data-testid="c2-memory-add-submit"]',
    )!;
    await act(async () => {
      submit.click();
    });
    expect(mocks.createMemoryCapsule).toHaveBeenCalledWith(
      "My daughter's recital is in June",
      "tok",
    );

    // Read-back: rebuild the projection from the wallet read and
    // re-render - the new entry is there with provenance + date.
    section = await buildSettingsSection("memory", { session: null, bearer: "tok" });
    await render(<C2SettingsSection section={section} events={events} />);
    const row = container.querySelector('[data-testid="c2-setting-row-forget-capsule-cap-new"]');
    expect(row).toBeTruthy();
    expect(row!.textContent).toContain("My daughter's recital is in June");
    expect(row!.textContent).toContain("You told Opal");
    expect(row!.textContent).toContain("Saved Oct 19, 2026");
  });

  it("an unwired host refuses honestly - error line, no create attempted", async () => {
    const section = await buildSettingsSection("memory", { session: null, bearer: "tok" });
    await render(<C2SettingsSection section={section} events={baseEvents} />);
    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="c2-memory-add-input"]',
    )!;
    typeInto(input, "Remember this thing");
    const submit = container.querySelector<HTMLButtonElement>(
      '[data-testid="c2-memory-add-submit"]',
    )!;
    await act(async () => {
      submit.click();
    });
    expect(mocks.createMemoryCapsule).not.toHaveBeenCalled();
    expect(container.textContent).toMatch(/not wired in this build/);
  });

  it("the facts room: forget-only truth stated, with the way to Memory", async () => {
    const section = await buildSettingsSection("what-opal-remembers", {
      session: null,
      bearer: "tok",
    });
    await render(<C2SettingsSection section={section} events={baseEvents} />);
    expect(container.textContent).toMatch(/you can only forget them here, not add to them/);
    expect(container.textContent).toMatch(/fuller form/);
    expect(
      container.querySelector('[data-testid="c2-setting-row-to-memory"]'),
    ).toBeTruthy();
  });
});
