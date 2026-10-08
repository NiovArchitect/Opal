/**
 * Intelligence data-source flags — mock vs real vs auto.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTEL_DATA_SOURCE_STORAGE_KEY,
  __resetIntelligenceDataSourceForTests,
  __setIntelligenceDataSourceForTests,
  allowsMockFallback,
  getAllIntelligenceDataSources,
  getIntelligenceDataSource,
  requiresRealData,
  setIntelligenceDataSource,
} from "./intelligenceDataSource";
import {
  __resetIntelligenceMocks,
  fetchCurrentBriefing,
  fetchMediationItems,
  fetchPersonMemory,
  PERSON_MEMORY_MOCK,
  MEDIATION_MOCK_ITEMS,
  WEEKLY_BRIEFING_MOCK,
} from "../../api/intelligenceClient";
import { mergeReminderFeed } from "./reminderLifecycle";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  __resetIntelligenceDataSourceForTests();
  __resetIntelligenceMocks();
  localStorage.removeItem(INTEL_DATA_SOURCE_STORAGE_KEY);
  // Reset location search without full navigation
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  __resetIntelligenceDataSourceForTests();
  localStorage.removeItem(INTEL_DATA_SOURCE_STORAGE_KEY);
  window.history.replaceState({}, "", "/");
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("getIntelligenceDataSource", () => {
  it("defaults every surface to mock", () => {
    const all = getAllIntelligenceDataSources();
    expect(all.person_memory).toBe("mock");
    expect(all.mediation).toBe("mock");
    expect(all.weekly_briefing).toBe("mock");
    expect(all.reminder_attention).toBe("mock");
    expect(all.choreography_events).toBe("mock");
  });

  it("reads per-surface localStorage JSON", () => {
    setIntelligenceDataSource({
      person_memory: "real",
      mediation: "auto",
    });
    expect(getIntelligenceDataSource("person_memory")).toBe("real");
    expect(getIntelligenceDataSource("mediation")).toBe("auto");
    expect(getIntelligenceDataSource("weekly_briefing")).toBe("mock");
  });

  it("reads global string mode from localStorage", () => {
    setIntelligenceDataSource("auto");
    expect(getIntelligenceDataSource("person_memory")).toBe("auto");
    expect(getIntelligenceDataSource("mediation")).toBe("auto");
  });

  it("?opal_intel_real=1 flips all surfaces to real", () => {
    window.history.replaceState({}, "", "/?opal_intel_real=1");
    expect(getIntelligenceDataSource("person_memory")).toBe("real");
    expect(getIntelligenceDataSource("weekly_briefing")).toBe("real");
    expect(requiresRealData("mediation")).toBe(true);
    expect(allowsMockFallback("mediation")).toBe(false);
  });

  it("?opal_intel_real=person_memory flips only that surface", () => {
    window.history.replaceState({}, "", "/?opal_intel_real=person_memory");
    expect(getIntelligenceDataSource("person_memory")).toBe("real");
    expect(getIntelligenceDataSource("mediation")).toBe("mock");
  });

  it("query overrides localStorage", () => {
    setIntelligenceDataSource({ person_memory: "auto" });
    window.history.replaceState({}, "", "/?opal_intel_real=person_memory");
    expect(getIntelligenceDataSource("person_memory")).toBe("real");
  });
});

describe("intelligenceClient mock vs real path", () => {
  function mockFetch(status: number, body: unknown = {}) {
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 404 ? "Not Found" : "Error",
        json: async () => body,
      } as Response;
    });
  }

  it("mock flag remocks person_memory on 404", async () => {
    __setIntelligenceDataSourceForTests({ person_memory: "mock" });
    mockFetch(404, { message: "missing" });
    const view = await fetchPersonMemory("person-maya");
    expect(view._mock).toBe(true);
    expect(view._error).toBeUndefined();
    expect(view.display_name).toBe(PERSON_MEMORY_MOCK.display_name);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("real flag returns honest empty + _error on 404 (no remock)", async () => {
    __setIntelligenceDataSourceForTests({ person_memory: "real" });
    mockFetch(404, { message: "missing" });
    const view = await fetchPersonMemory("person-maya", {
      displayName: "Maya",
    });
    expect(view._mock).toBe(false);
    expect(view._error).toBeTruthy();
    expect(view.known_facts).toEqual([]);
    expect(view.display_name).toBe("Maya");
  });

  it("real flag returns live payload when API ok", async () => {
    __setIntelligenceDataSourceForTests({ person_memory: "real" });
    mockFetch(200, {
      person_id: "p-live",
      display_name: "Live Maya",
      known_facts: [{ key: "birthday", value: "June 14" }],
      rhythms: [],
      important_dates: [],
      open_loops: [],
      learned_preferences: [],
    });
    const view = await fetchPersonMemory("p-live");
    expect(view._mock).toBe(false);
    expect(view._error).toBeUndefined();
    expect(view.display_name).toBe("Live Maya");
    expect(view.known_facts[0]?.value).toBe("June 14");
  });

  it("mock flag remocks mediation; real returns empty + _error", async () => {
    __setIntelligenceDataSourceForTests({ mediation: "mock" });
    mockFetch(404);
    const mocked = await fetchMediationItems();
    expect(mocked._mock).toBe(true);
    expect(mocked.items).toHaveLength(MEDIATION_MOCK_ITEMS.length);

    __setIntelligenceDataSourceForTests({ mediation: "real" });
    mockFetch(404);
    const real = await fetchMediationItems();
    expect(real._mock).toBe(false);
    expect(real.items).toEqual([]);
    expect(real._error).toBeTruthy();
  });

  it("auto flag remocks briefing on miss; real throws", async () => {
    __setIntelligenceDataSourceForTests({ weekly_briefing: "auto" });
    mockFetch(404);
    const auto = await fetchCurrentBriefing();
    expect(auto.id).toBe(WEEKLY_BRIEFING_MOCK.id);
    expect(auto._mock).toBe(true);

    __setIntelligenceDataSourceForTests({ weekly_briefing: "real" });
    mockFetch(503, { message: "down" });
    await expect(fetchCurrentBriefing()).rejects.toThrow(/weekly_briefing|down/i);
  });
});

describe("reminder_attention flag", () => {
  it("real flag does not inject mock seed when feed empty", () => {
    __setIntelligenceDataSourceForTests({ reminder_attention: "real" });
    const rows = mergeReminderFeed([]);
    expect(rows).toHaveLength(0);
  });

  it("mock flag seeds when feed empty", () => {
    __setIntelligenceDataSourceForTests({ reminder_attention: "mock" });
    const rows = mergeReminderFeed([]);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("forceSeed still works under real for fixture screenshots", () => {
    __setIntelligenceDataSourceForTests({ reminder_attention: "real" });
    const rows = mergeReminderFeed([], { forceSeed: true });
    expect(rows.length).toBe(4);
  });
});
