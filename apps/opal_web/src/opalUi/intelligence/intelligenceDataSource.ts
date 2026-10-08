/**
 * Intelligence data-source flags (Paste F Phase 6 amended).
 *
 * Per-surface modes:
 *   mock — current typed-mock behavior (API miss → remock)
 *   real — call product HTTP; on failure show honest empty/error (never remock)
 *   auto — try real, remock only on failure
 *
 * Default: mock for every surface (mocks retained until founder validation).
 *
 * Overrides (highest wins):
 *   1. in-memory test override
 *   2. ?opal_intel_real=1 | ?opal_intel_real=person_memory[,mediation]
 *   3. localStorage `opal.intelligence.data_source.v1` JSON
 */

export type IntelligenceSurface =
  | "person_memory"
  | "mediation"
  | "weekly_briefing"
  | "reminder_attention"
  | "choreography_events";

export type DataSourceMode = "mock" | "real" | "auto";

export const INTELLIGENCE_SURFACES: IntelligenceSurface[] = [
  "person_memory",
  "mediation",
  "weekly_briefing",
  "reminder_attention",
  "choreography_events",
];

export const INTEL_DATA_SOURCE_STORAGE_KEY =
  "opal.intelligence.data_source.v1";

export const INTEL_REAL_QUERY_PARAM = "opal_intel_real";

const DEFAULT_MODE: DataSourceMode = "mock";

type StoredShape =
  | DataSourceMode
  | Partial<Record<IntelligenceSurface | "default", DataSourceMode>>;

let testOverride: Partial<Record<IntelligenceSurface, DataSourceMode>> | null =
  null;

function isMode(v: unknown): v is DataSourceMode {
  return v === "mock" || v === "real" || v === "auto";
}

function readStorage(): StoredShape | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(INTEL_DATA_SOURCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (isMode(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      return parsed as StoredShape;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function queryRealSurfaces(): Set<IntelligenceSurface> | "all" | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = new URL(window.location.href).searchParams.get(
      INTEL_REAL_QUERY_PARAM,
    );
    if (raw == null || raw === "") return null;
    if (raw === "1" || raw.toLowerCase() === "all" || raw === "true") {
      return "all";
    }
    const set = new Set<IntelligenceSurface>();
    for (const part of raw.split(/[,+\s]+/)) {
      const s = part.trim() as IntelligenceSurface;
      if ((INTELLIGENCE_SURFACES as string[]).includes(s)) set.add(s);
    }
    return set.size ? set : null;
  } catch {
    return null;
  }
}

function modeFromStorage(
  surface: IntelligenceSurface,
  stored: StoredShape | null,
): DataSourceMode | null {
  if (!stored) return null;
  if (isMode(stored)) return stored;
  const per = stored[surface];
  if (isMode(per)) return per;
  if (isMode(stored.default)) return stored.default;
  return null;
}

/** Resolve effective mode for one intelligence surface. */
export function getIntelligenceDataSource(
  surface: IntelligenceSurface,
): DataSourceMode {
  if (testOverride && isMode(testOverride[surface])) {
    return testOverride[surface]!;
  }

  const q = queryRealSurfaces();
  if (q === "all") return "real";
  if (q && q.has(surface)) return "real";

  const fromStore = modeFromStorage(surface, readStorage());
  if (fromStore) return fromStore;

  return DEFAULT_MODE;
}

/** Snapshot of all surface modes (for docs / debug). */
export function getAllIntelligenceDataSources(): Record<
  IntelligenceSurface,
  DataSourceMode
> {
  const out = {} as Record<IntelligenceSurface, DataSourceMode>;
  for (const s of INTELLIGENCE_SURFACES) {
    out[s] = getIntelligenceDataSource(s);
  }
  return out;
}

/**
 * Persist per-surface (or global string) override.
 * Pass null to clear storage.
 */
export function setIntelligenceDataSource(
  value: StoredShape | null,
): void {
  if (typeof localStorage === "undefined") return;
  if (value == null) {
    localStorage.removeItem(INTEL_DATA_SOURCE_STORAGE_KEY);
    return;
  }
  localStorage.setItem(INTEL_DATA_SOURCE_STORAGE_KEY, JSON.stringify(value));
}

/** True when failure may remock (mock or auto). Real never remocks. */
export function allowsMockFallback(surface: IntelligenceSurface): boolean {
  const mode = getIntelligenceDataSource(surface);
  return mode === "mock" || mode === "auto";
}

/** True when mode is strictly real — honest empty/error on API miss. */
export function requiresRealData(surface: IntelligenceSurface): boolean {
  return getIntelligenceDataSource(surface) === "real";
}

/** Test-only override (does not touch localStorage). */
export function __setIntelligenceDataSourceForTests(
  override: Partial<Record<IntelligenceSurface, DataSourceMode>> | null,
): void {
  testOverride = override;
}

export function __resetIntelligenceDataSourceForTests(): void {
  testOverride = null;
}
