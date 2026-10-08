/**
 * Intelligence data-source flags (Paste F Phase 6 amended → Bring-to-life Phase 2).
 *
 * Per-surface modes:
 *   mock — typed-mock behavior (API miss → remock) — fallback / founder remock only
 *   real — call product HTTP; on failure show honest empty/error (never remock)
 *   auto — try real, remock only on failure
 *
 * Default: REAL for every surface (founder walk validated the approach).
 * Mocks remain in codebase until per-surface "good"; they are fallback only.
 *
 * REAL_API_AUDIT (shots/audit/REAL_API_AUDIT.md) — flag → endpoint → handler → table:
 *   person_memory       → GET/PATCH/DELETE /intelligence/people/:id/memory
 *                         → ProductSurface → person_memories (+ routines, temporal_anchors,
 *                         outcome_signals, relationship_behavior_profiles) — REAL
 *   reminder_attention  → GET /attention → AttentionCenter → attention_center_items
 *                         (+ temporal_anchors / plan_memories enrichment) — REAL
 *   mediation           → GET/POST /intelligence/mediation* → group_decision_states — REAL
 *   weekly_briefing     → GET/POST /intelligence/briefings* → weekly_briefings — REAL
 *   choreography_events → Phoenix user: channel BroadcastChoreography (first-class
 *                         intelligence:* events from real decision/briefing/anchor rows) — REAL
 *
 * Overrides (highest wins):
 *   1. in-memory test override
 *   2. ?opal_intel_real=1 | ?opal_intel_real=person_memory[,mediation]
 *   3. localStorage `opal.intelligence.data_source.v1` JSON
 *   4. ?opal_intel_mock=1 forces mock fallback for local demos
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

/** Product default after founder Phase 6 walk — mocks are fallback only. */
const DEFAULT_MODE: DataSourceMode = "real";

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

function queryMockAll(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = new URL(window.location.href).searchParams.get("opal_intel_mock");
    return raw === "1" || raw === "true" || raw === "all";
  } catch {
    return false;
  }
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

  if (queryMockAll()) return "mock";

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
