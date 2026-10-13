/**
 * Appearance setting — You hub GREEN wire (UI → localStorage → data-theme).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { YouSettingsDestination } from "./YouSettingsDestination";
import {
  APPEARANCE_STORAGE_KEY,
  readAppearancePreference,
} from "../theme/appearanceTheme";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("Appearance You setting", () => {
  it("paints System / Dark / Light and persists selection to data-theme", async () => {
    await act(async () => {
      root.render(
        <YouSettingsDestination setting="appearance" onBack={() => undefined} session={null} />,
      );
    });

    const text = container.textContent || "";
    expect(text).toMatch(/Appearance/);
    expect(text).toMatch(/System/);
    expect(text).toMatch(/Dark/);
    expect(text).toMatch(/Light/);
    expect(text).not.toMatch(/Coming soon/i);

    const lightBtn = container.querySelector(
      '[data-testid="appearance-theme-light"]',
    ) as HTMLButtonElement | null;
    expect(lightBtn).toBeTruthy();

    await act(async () => {
      lightBtn?.click();
    });

    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("light");
    expect(readAppearancePreference()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(lightBtn?.getAttribute("aria-checked")).toBe("true");
  });
});
