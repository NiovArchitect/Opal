/**
 * Repair #18 - Division C2 - mode plumbing (track-c2 section 2.7, D8).
 *
 * Mode is a single attribute, data-mode="light|dark", on <html>.
 * public/c2-boot.js resolves it BEFORE first paint on the C2 shell
 * path; this module owns it at runtime. Switching flips the attribute
 * only: token swap is pure CSS custom-property resolution, so there is
 * no reload, no remount, no layout change, and scroll position and
 * drafts are preserved.
 *
 * Persisted preference key: opal.c2.mode.v1 (system | light | dark,
 * default system). It is a device preference, not account data: it
 * survives sign-out and the R17 fallback never reads it.
 */

export type C2ModePreference = "system" | "light" | "dark";
export type C2ResolvedMode = "light" | "dark";

export const C2_MODE_STORAGE_KEY = "opal.c2.mode.v1";
export const C2_SHELL_STORAGE_KEY = "opal.c2.shell.v1";

/** Ground colors painted before first paint - must match c2Tokens.css. */
export const C2_GROUND = {
  dark: "#0d0b12",
  light: "#fffefb",
} as const;

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function normalizeC2ModePreference(raw: unknown): C2ModePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export function getSystemC2Mode(
  mql?: MediaQueryList | { matches: boolean } | null,
): C2ResolvedMode {
  try {
    const media =
      mql ??
      (typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null);
    // No signal at all: default to dark (Opal's night-safe default).
    if (!media) return "dark";
    return media.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

export function resolveC2Mode(
  preference: C2ModePreference,
  systemMode: C2ResolvedMode = getSystemC2Mode(),
): C2ResolvedMode {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemMode;
}

export function readC2ModePreference(): C2ModePreference {
  const store = safeStorage();
  if (!store) return "system";
  try {
    return normalizeC2ModePreference(store.getItem(C2_MODE_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function applyC2Mode(
  mode: C2ResolvedMode,
  root: HTMLElement | null = typeof document !== "undefined"
    ? document.documentElement
    : null,
): C2ResolvedMode {
  if (!root) return mode;
  root.setAttribute("data-mode", mode);
  root.style.colorScheme = mode;
  // Keep the legacy appearance attribute coherent on C2 surfaces so a
  // surface that still reads data-theme never pairs the wrong ground.
  root.setAttribute("data-theme", mode);
  root.style.background = C2_GROUND[mode];
  const meta =
    typeof document !== "undefined"
      ? document.querySelector('meta[name="theme-color"]')
      : null;
  if (meta) meta.setAttribute("content", C2_GROUND[mode]);
  return mode;
}

/** Read the stored preference, resolve SYSTEM, apply. Boot + runtime. */
export function applyStoredC2Mode(
  root: HTMLElement | null = typeof document !== "undefined"
    ? document.documentElement
    : null,
): { preference: C2ModePreference; mode: C2ResolvedMode } {
  const preference = readC2ModePreference();
  const mode = resolveC2Mode(preference);
  applyC2Mode(mode, root);
  return { preference, mode };
}

/** Persist + apply in the same frame. No reload, ever. */
export function setC2ModePreference(
  preference: C2ModePreference,
  root: HTMLElement | null = typeof document !== "undefined"
    ? document.documentElement
    : null,
): { preference: C2ModePreference; mode: C2ResolvedMode } {
  const next = normalizeC2ModePreference(preference);
  const store = safeStorage();
  if (store) {
    try {
      store.setItem(C2_MODE_STORAGE_KEY, next);
    } catch {
      /* private mode / quota - the attribute still applies */
    }
  }
  const mode = resolveC2Mode(next);
  applyC2Mode(mode, root);
  return { preference: next, mode };
}

let systemListener: ((e: MediaQueryListEvent) => void) | null = null;
let systemMql: MediaQueryList | null = null;

/** Keep a SYSTEM preference live when the OS theme flips. */
export function installC2ModeSystemListener(): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  uninstallC2ModeSystemListener();
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readC2ModePreference() !== "system") return;
    applyC2Mode(getSystemC2Mode(mql));
  };
  systemMql = mql;
  systemListener = onChange;
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
  }
  return uninstallC2ModeSystemListener;
}

export function uninstallC2ModeSystemListener(): void {
  if (!systemMql || !systemListener) return;
  if (typeof systemMql.removeEventListener === "function") {
    systemMql.removeEventListener("change", systemListener);
  }
  systemMql = null;
  systemListener = null;
}
