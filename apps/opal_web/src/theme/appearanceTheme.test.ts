import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  applyAppearanceTheme,
  applyStoredAppearanceTheme,
  getSystemAppearanceTheme,
  normalizeAppearancePreference,
  readAppearancePreference,
  resolveAppearanceTheme,
  setAppearancePreference,
  writeAppearancePreference,
} from "./appearanceTheme";

describe("appearanceTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  it("normalizes unknown values to system", () => {
    expect(normalizeAppearancePreference("dark")).toBe("dark");
    expect(normalizeAppearancePreference("light")).toBe("light");
    expect(normalizeAppearancePreference("system")).toBe("system");
    expect(normalizeAppearancePreference("neon")).toBe("system");
    expect(normalizeAppearancePreference(null)).toBe("system");
  });

  it("resolves SYSTEM from prefers-color-scheme", () => {
    expect(resolveAppearanceTheme("dark")).toBe("dark");
    expect(resolveAppearanceTheme("light")).toBe("light");
    expect(resolveAppearanceTheme("system", "light")).toBe("light");
    expect(resolveAppearanceTheme("system", "dark")).toBe("dark");
    expect(getSystemAppearanceTheme({ matches: true })).toBe("light");
    expect(getSystemAppearanceTheme({ matches: false })).toBe("dark");
  });

  it("persists preference and applies data-theme on documentElement", () => {
    const applied = setAppearancePreference("light");
    expect(applied.preference).toBe("light");
    expect(applied.theme).toBe("light");
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");

    expect(readAppearancePreference()).toBe("light");
    const restored = applyStoredAppearanceTheme();
    expect(restored.preference).toBe("light");
    expect(restored.theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("SYSTEM preference paints resolved theme and survives reload read", () => {
    writeAppearancePreference("system");
    const spy = vi.spyOn(window, "matchMedia").mockImplementation(
      () =>
        ({
          matches: true,
          media: "(prefers-color-scheme: light)",
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
          onchange: null,
        }) as MediaQueryList,
    );
    const restored = applyStoredAppearanceTheme();
    expect(restored.preference).toBe("system");
    expect(restored.theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    spy.mockRestore();

    applyAppearanceTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
