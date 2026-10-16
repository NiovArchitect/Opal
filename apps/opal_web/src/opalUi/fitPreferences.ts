/**
 * Fit preferences — local activity / wellness substrate for You → Fit.
 * Share gate controls whether Center/context may read a summary.
 */

export type FitActivityId =
  | "walk"
  | "run"
  | "yoga"
  | "strength"
  | "outdoors"
  | "rest"
  | string;

export type WellnessGoal =
  | "move_more"
  | "recover"
  | "stay_active"
  | "none"
  | string;

export type FitPreferences = {
  activities: FitActivityId[];
  wellnessGoal: WellnessGoal;
  shareActivityPrefs: boolean;
};

export const FIT_ACTIVITY_OPTIONS: ReadonlyArray<{
  id: FitActivityId;
  label: string;
}> = [
  { id: "walk", label: "Walk" },
  { id: "run", label: "Run" },
  { id: "yoga", label: "Yoga" },
  { id: "strength", label: "Strength" },
  { id: "outdoors", label: "Outdoors" },
  { id: "rest", label: "Rest" },
];

export const WELLNESS_GOAL_OPTIONS: ReadonlyArray<{
  value: WellnessGoal;
  label: string;
}> = [
  { value: "move_more", label: "Move more" },
  { value: "recover", label: "Recover" },
  { value: "stay_active", label: "Stay active" },
  { value: "none", label: "None" },
];

const DEFAULT_PREFS: FitPreferences = {
  activities: [],
  wellnessGoal: "none",
  shareActivityPrefs: false,
};

export function fitPreferencesStorageKey(userId: string | null | undefined): string {
  return `opal.fit.prefs.${userId || "anon"}`;
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function normalizeActivities(raw: unknown): FitActivityId[] {
  if (!Array.isArray(raw)) return [];
  const out: FitActivityId[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      const id = item.trim();
      if (!out.includes(id)) out.push(id);
    }
  }
  return out;
}

function normalizeWellnessGoal(raw: unknown): WellnessGoal {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "none";
}

export function normalizeFitPreferences(raw: unknown): FitPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS, activities: [] };
  const obj = raw as Record<string, unknown>;
  return {
    activities: normalizeActivities(obj.activities),
    wellnessGoal: normalizeWellnessGoal(obj.wellnessGoal),
    shareActivityPrefs: obj.shareActivityPrefs === true,
  };
}

export function loadFitPreferences(userId: string | null | undefined): FitPreferences {
  const store = safeStorage();
  if (!store) return { ...DEFAULT_PREFS, activities: [] };
  try {
    const raw = store.getItem(fitPreferencesStorageKey(userId));
    if (!raw) return { ...DEFAULT_PREFS, activities: [] };
    return normalizeFitPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS, activities: [] };
  }
}

export function saveFitPreferences(
  userId: string | null | undefined,
  prefs: FitPreferences,
): void {
  const next = normalizeFitPreferences(prefs);
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(fitPreferencesStorageKey(userId), JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Bounded Fit slice for Center client_context (share gate required). */
export type FitContextSlice = {
  activities: FitActivityId[];
  goal: WellnessGoal | null;
};

const FIT_SLICE_ACTIVITY_CAP = 6;

/**
 * Structured Fit prefs for Opal Center → BE OpalContext `:fit`.
 * Null when share is off or nothing useful is set. Never invents prefs.
 */
export function readFitSliceForOpal(
  userId: string | null | undefined,
): FitContextSlice | null {
  const prefs = loadFitPreferences(userId);
  if (!prefs.shareActivityPrefs) return null;

  const activities = prefs.activities.slice(0, FIT_SLICE_ACTIVITY_CAP);
  const goal =
    prefs.wellnessGoal && prefs.wellnessGoal !== "none" ? prefs.wellnessGoal : null;
  if (!activities.length && !goal) return null;
  return { activities, goal };
}

export function readFitContextForOpal(
  userId: string | null | undefined,
): string | null {
  const slice = readFitSliceForOpal(userId);
  if (!slice) {
    const prefs = loadFitPreferences(userId);
    if (!prefs.shareActivityPrefs) return null;
    return "Fit preferences shared (none set yet).";
  }

  const labels = slice.activities
    .map((id) => FIT_ACTIVITY_OPTIONS.find((o) => o.id === id)?.label || id)
    .filter(Boolean);
  const goalLabel =
    slice.goal &&
    (WELLNESS_GOAL_OPTIONS.find((o) => o.value === slice.goal)?.label || slice.goal);

  const parts: string[] = [];
  if (labels.length) parts.push(`activities: ${labels.join(", ")}`);
  if (goalLabel) parts.push(`goal: ${goalLabel}`);
  if (!parts.length) return "Fit preferences shared (none set yet).";
  return `Fit - ${parts.join("; ")}.`;
}
