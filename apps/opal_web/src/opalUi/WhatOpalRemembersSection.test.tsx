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
const listRelationships = vi.fn(async () => ({
  relationships: [],
  contacts: [
    { contact_user_id: "c1", display_name: "Maya Chen", type: null },
    { contact_user_id: "c2", display_name: "Jordan Lee", type: "friend" },
  ],
  allowed_types: [
    "spouse",
    "partner",
    "family",
    "close_friend",
    "friend",
    "business",
    "acquaintance",
  ],
}));
const setRelationshipType = vi.fn(async (id: string, type: string) => ({
  relationship: {
    id: "r1",
    user_id: "u-a",
    contact_user_id: id,
    type,
  },
}));
const getTrustTier = vi.fn(async () => ({
  tier: "known",
  friendly_name: "Finding your rhythm",
  can_access: ["basic", "taste", "celebrations", "plans"],
  can_access_labels: [
    "Name, handle, and timezone",
    "Taste preferences",
    "Celebration dates",
    "Plan history",
  ],
  next_tier: "trusted",
  next_friendly_name: "Deep understanding",
  next_requirements: "Active 30+ days or grant manually",
}));
const grantInnerCircleTrust = vi.fn(async () => ({
  tier: "inner_circle",
  info: {
    tier: "inner_circle",
    friendly_name: "Complete trust",
    can_access: ["basic", "taste", "celebrations", "plans", "financial", "relationships", "intimate"],
    can_access_labels: ["Name, handle, and timezone"],
    next_tier: null,
    next_requirements: null,
  },
}));
const getFinancialProfile = vi.fn(async () => null);
const setFinancialProfile = vi.fn(async (attrs: { comfort_level: string }) => ({
  profile: {
    id: "fp1",
    user_id: "u-a",
    comfort_level: attrs.comfort_level,
    dining_range: null,
    activity_range: null,
    notes: null,
  },
}));
const deleteFinancialProfile = vi.fn(async () => ({ deleted: true, status: "deleted" }));

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    listMemoryFacts: (...args: unknown[]) => listMemoryFacts(...args),
    forgetMemoryFact: (...args: unknown[]) => forgetMemoryFact(...(args as [never])),
    listRelationships: (...args: unknown[]) => listRelationships(...args),
    setRelationshipType: (...args: unknown[]) =>
      setRelationshipType(...(args as [string, string])),
    getTrustTier: (...args: unknown[]) => getTrustTier(...args),
    grantInnerCircleTrust: (...args: unknown[]) => grantInnerCircleTrust(...args),
    getFinancialProfile: (...args: unknown[]) => getFinancialProfile(...args),
    setFinancialProfile: (...args: unknown[]) =>
      setFinancialProfile(...(args as [{ comfort_level: string }])),
    deleteFinancialProfile: (...args: unknown[]) => deleteFinancialProfile(...args),
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
  listRelationships.mockReset().mockResolvedValue({
    relationships: [],
    contacts: [
      { contact_user_id: "c1", display_name: "Maya Chen", type: null },
      { contact_user_id: "c2", display_name: "Jordan Lee", type: "friend" },
    ],
    allowed_types: [
      "spouse",
      "partner",
      "family",
      "close_friend",
      "friend",
      "business",
      "acquaintance",
    ],
  });
  setRelationshipType.mockReset().mockImplementation(async (id: string, type: string) => ({
    relationship: { id: "r1", user_id: "u-a", contact_user_id: id, type },
  }));
  getTrustTier.mockReset().mockResolvedValue({
    tier: "known",
    friendly_name: "Finding your rhythm",
    can_access: ["basic", "taste", "celebrations", "plans"],
    can_access_labels: [
      "Name, handle, and timezone",
      "Taste preferences",
      "Celebration dates",
      "Plan history",
    ],
    next_tier: "trusted",
    next_friendly_name: "Deep understanding",
    next_requirements: "Active 30+ days or grant manually",
  });
  grantInnerCircleTrust.mockReset().mockResolvedValue({
    tier: "inner_circle",
    info: {
      tier: "inner_circle",
      friendly_name: "Complete trust",
      can_access: [
        "basic",
        "taste",
        "celebrations",
        "plans",
        "financial",
        "relationships",
        "intimate",
      ],
      can_access_labels: ["Name, handle, and timezone"],
      next_tier: null,
      next_requirements: null,
    },
  });
  getFinancialProfile.mockReset().mockResolvedValue(null);
  setFinancialProfile.mockReset().mockImplementation(async (attrs: { comfort_level: string }) => ({
    profile: {
      id: "fp1",
      user_id: "u-a",
      comfort_level: attrs.comfort_level,
      dining_range: null,
      activity_range: null,
      notes: null,
    },
  }));
  deleteFinancialProfile.mockReset().mockResolvedValue({ deleted: true, status: "deleted" });
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

  it("RU-1 People lists contacts with type or Not set", async () => {
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="what-opal-remembers-people"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="people-name-c1"]')?.textContent).toBe(
      "Maya Chen",
    );
    expect(container.querySelector('[data-testid="people-type-c1"]')?.textContent).toBe("Not set");
    expect(container.querySelector('[data-testid="people-type-c2"]')?.textContent).toBe("Friend");
  });

  it("RU-1 tapping contact opens picker and saves type", async () => {
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    const row = container.querySelector('[data-testid="people-row-c1"]') as HTMLButtonElement;
    await act(async () => {
      row.click();
    });
    await flush();

    expect(container.querySelector('[data-testid="people-type-picker"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="people-picker-prompt"]')?.textContent).toMatch(
      /How do you know Maya Chen/,
    );

    const spouse = container.querySelector(
      '[data-testid="people-type-option-spouse"]',
    ) as HTMLButtonElement;
    await act(async () => {
      spouse.click();
    });
    await flush();

    expect(setRelationshipType).toHaveBeenCalledWith("c1", "spouse", undefined, "tok-a");
    expect(container.querySelector('[data-testid="people-type-c1"]')?.textContent).toBe("Spouse");
    expect(container.querySelector('[data-testid="people-type-picker"]')).toBeNull();
  });

  it("RU-2 Trust & Privacy shows friendly tier and access list", async () => {
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="what-opal-remembers-trust"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="trust-tier-name"]')?.textContent).toBe(
      "Finding your rhythm",
    );
    expect(container.querySelector('[data-testid="trust-access-list"]')?.textContent).toMatch(
      /Taste preferences/,
    );
    expect(container.querySelector('[data-testid="trust-next"]')?.textContent).toMatch(
      /Deep understanding/,
    );
    expect(container.querySelector('[data-testid="trust-grant-button"]')).toBeTruthy();
  });

  it("RU-2 Grant complete trust confirms then saves", async () => {
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    const btn = container.querySelector('[data-testid="trust-grant-button"]') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    await flush();

    expect(container.querySelector('[data-testid="trust-grant-confirm"]')?.textContent).toMatch(
      /access everything you share/,
    );

    const yes = container.querySelector(
      '[data-testid="trust-grant-confirm-yes"]',
    ) as HTMLButtonElement;
    await act(async () => {
      yes.click();
    });
    await flush();

    expect(grantInnerCircleTrust).toHaveBeenCalledWith("tok-a");
    expect(container.querySelector('[data-testid="trust-tier-name"]')?.textContent).toBe(
      "Complete trust",
    );
  });

  it("RU-3 Spending comfort hidden below trusted", async () => {
    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="spending-comfort"]')).toBeNull();
  });

  it("RU-3 Spending comfort shows for trusted and saves level", async () => {
    getTrustTier.mockResolvedValue({
      tier: "trusted",
      friendly_name: "Deep understanding",
      can_access: ["basic", "taste", "celebrations", "plans", "financial", "relationships"],
      can_access_labels: ["Name, handle, and timezone", "Financial comfort"],
      next_tier: "inner_circle",
      next_friendly_name: "Complete trust",
      next_requirements: "Grant complete trust yourself",
    });

    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    expect(container.querySelector('[data-testid="spending-comfort"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="spending-comfort"]')?.textContent).toMatch(
      /fit your life/,
    );

    const budget = container.querySelector(
      '[data-testid="spending-level-budget"]',
    ) as HTMLButtonElement;
    await act(async () => {
      budget.click();
    });
    await flush();

    const save = container.querySelector('[data-testid="spending-save"]') as HTMLButtonElement;
    await act(async () => {
      save.click();
    });
    await flush();

    expect(setFinancialProfile).toHaveBeenCalled();
    const args = setFinancialProfile.mock.calls[0];
    expect(args[0].comfort_level).toBe("budget");
    expect(container.querySelector('[data-testid="spending-remove"]')).toBeTruthy();
  });

  it("RU-3 remove spending data confirms then deletes", async () => {
    getTrustTier.mockResolvedValue({
      tier: "trusted",
      friendly_name: "Deep understanding",
      can_access: ["basic", "taste", "celebrations", "plans", "financial", "relationships"],
      can_access_labels: ["Financial comfort"],
      next_tier: "inner_circle",
      next_friendly_name: "Complete trust",
      next_requirements: "Grant complete trust yourself",
    });
    getFinancialProfile.mockResolvedValue({
      id: "fp1",
      user_id: "u-a",
      comfort_level: "moderate",
      dining_range: { min: 25, max: 60 },
      notes: "splurge on birthdays",
    });

    await act(async () => {
      root.render(<WhatOpalRemembersSection session={session} />);
    });
    await flush();

    const remove = container.querySelector(
      '[data-testid="spending-remove"]',
    ) as HTMLButtonElement;
    await act(async () => {
      remove.click();
    });
    await flush();

    expect(container.querySelector('[data-testid="spending-remove-confirm"]')).toBeTruthy();
    const yes = container.querySelector(
      '[data-testid="spending-remove-yes"]',
    ) as HTMLButtonElement;
    await act(async () => {
      yes.click();
    });
    await flush();

    expect(deleteFinancialProfile).toHaveBeenCalledWith("tok-a");
    expect(container.querySelector('[data-testid="spending-remove"]')).toBeNull();
  });
});
