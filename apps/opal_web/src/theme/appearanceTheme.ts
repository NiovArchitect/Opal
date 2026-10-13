/**
 * Appearance preference — SYSTEM | DARK | LIGHT.
 * Persists locally; applies data-theme + color-scheme on documentElement.
 * Dark remains the canonical Opal expression; light remaps surfaces/text only.
 */

export type AppearancePreference = "system" | "dark" | "light";
export type ResolvedAppearanceTheme = "dark" | "light";

export const APPEARANCE_STORAGE_KEY = "opal.appearance.theme.v1";

export const APPEARANCE_OPTIONS: ReadonlyArray<{
  value: AppearancePreference;
  label: string;
  description: string;
}> = [
  {
    value: "system",
    label: "System",
    description: "Match this device’s light or dark setting.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Midnight Opal — Opal’s darkest look.",
  },
  {
    value: "light",
    label: "Light",
    description: "Pearl surfaces with the same brand accents.",
  },
];

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function normalizeAppearancePreference(raw: unknown): AppearancePreference {
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  return "system";
}

export function getSystemAppearanceTheme(
  mql?: MediaQueryList | { matches: boolean } | null,
): ResolvedAppearanceTheme {
  try {
    const media =
      mql ??
      (typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: light)")
        : null);
    return media?.matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function resolveAppearanceTheme(
  preference: AppearancePreference,
  systemTheme: ResolvedAppearanceTheme = getSystemAppearanceTheme(),
): ResolvedAppearanceTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemTheme;
}

export function readAppearancePreference(): AppearancePreference {
  const store = safeStorage();
  if (!store) return "system";
  try {
    return normalizeAppearancePreference(store.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writeAppearancePreference(preference: AppearancePreference): AppearancePreference {
  const next = normalizeAppearancePreference(preference);
  const store = safeStorage();
  if (store) {
    try {
      store.setItem(APPEARANCE_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }
  return next;
}

export function applyAppearanceTheme(
  theme: ResolvedAppearanceTheme,
  root: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null,
): ResolvedAppearanceTheme {
  if (!root) return theme;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  return theme;
}

/** Read preference, resolve SYSTEM, apply to documentElement. */
export function applyStoredAppearanceTheme(
  root: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null,
): { preference: AppearancePreference; theme: ResolvedAppearanceTheme } {
  const preference = readAppearancePreference();
  const theme = resolveAppearanceTheme(preference);
  applyAppearanceTheme(theme, root);
  return { preference, theme };
}

/** Persist + apply. Returns resolved theme actually painted. */
export function setAppearancePreference(
  preference: AppearancePreference,
  root: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null,
): { preference: AppearancePreference; theme: ResolvedAppearanceTheme } {
  const next = writeAppearancePreference(preference);
  const theme = resolveAppearanceTheme(next);
  applyAppearanceTheme(theme, root);
  return { preference: next, theme };
}

let systemListener: ((e: MediaQueryListEvent) => void) | null = null;
let systemMql: MediaQueryList | null = null;

/** Keep SYSTEM preference live when OS theme flips. Safe to call repeatedly. */
export function installAppearanceSystemListener(): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  uninstallAppearanceSystemListener();
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  const onChange = () => {
    if (readAppearancePreference() !== "system") return;
    applyAppearanceTheme(getSystemAppearanceTheme(mql));
  };
  systemMql = mql;
  systemListener = onChange;
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
  } else if (typeof (mql as MediaQueryList & { addListener?: (cb: (e: MediaQueryListEvent) => void) => void }).addListener === "function") {
    (mql as MediaQueryList & { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(onChange);
  }
  return uninstallAppearanceSystemListener;
}

export function uninstallAppearanceSystemListener(): void {
  if (!systemMql || !systemListener) return;
  const mql = systemMql;
  const onChange = systemListener;
  if (typeof mql.removeEventListener === "function") {
    mql.removeEventListener("change", onChange);
  } else if (
    typeof (mql as MediaQueryList & { removeListener?: (cb: (e: MediaQueryListEvent) => void) => void })
      .removeListener === "function"
  ) {
    (
      mql as MediaQueryList & { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }
    ).removeListener(onChange);
  }
  systemMql = null;
  systemListener = null;
}
