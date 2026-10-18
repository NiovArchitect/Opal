import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  C2_MODE_STORAGE_KEY,
  applyC2Mode,
  applyStoredC2Mode,
  getSystemC2Mode,
  normalizeC2ModePreference,
  readC2ModePreference,
  resolveC2Mode,
  setC2ModePreference,
} from "./c2Mode";

describe("c2Mode (track-c2 section 2.7)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    document.documentElement.style.background = "";
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("normalizes unknown values to system", () => {
    expect(normalizeC2ModePreference("dark")).toBe("dark");
    expect(normalizeC2ModePreference("light")).toBe("light");
    expect(normalizeC2ModePreference("neon")).toBe("system");
    expect(normalizeC2ModePreference(null)).toBe("system");
  });

  it("resolves explicit preferences without consulting the system", () => {
    expect(resolveC2Mode("dark", "light")).toBe("dark");
    expect(resolveC2Mode("light", "dark")).toBe("light");
    expect(resolveC2Mode("system", "light")).toBe("light");
    expect(resolveC2Mode("system", "dark")).toBe("dark");
    expect(getSystemC2Mode({ matches: true })).toBe("dark");
    expect(getSystemC2Mode({ matches: false })).toBe("light");
  });

  it("apply stamps data-mode, color-scheme and the mode ground", () => {
    applyC2Mode("dark");
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement.style.background).toBe("rgb(13, 11, 18)");
  });

  it("persists under opal.c2.mode.v1 and re-applies on read", () => {
    const r = setC2ModePreference("light");
    expect(r.mode).toBe("light");
    expect(localStorage.getItem(C2_MODE_STORAGE_KEY)).toBe("light");
    expect(readC2ModePreference()).toBe("light");
    const restored = applyStoredC2Mode();
    expect(restored.preference).toBe("light");
    expect(restored.mode).toBe("light");
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });

  it("switching is an attribute flip only - same document, no reload", () => {
    setC2ModePreference("dark");
    const before = document.documentElement.getAttribute("data-mode");
    setC2ModePreference("light");
    expect(before).toBe("dark");
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
  });
});
