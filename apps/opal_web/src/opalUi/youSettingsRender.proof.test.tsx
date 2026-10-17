/**
 * Pass B render proof — Privacy & Feed show working chrome only; never Coming soon
 * or technical blockedReason pills.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { YouSettingsDestination } from "./YouSettingsDestination";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OUT =
  "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/shots/screenshot_bugs/b1";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mkdirSync(OUT, { recursive: true });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("YouSettingsDestination render proof", () => {
  it("Privacy & audience hides blocked rows and has zero Coming soon", async () => {
    await act(async () => {
      root.render(
        <YouSettingsDestination setting="privacy" onBack={() => undefined} session={null} />,
      );
    });
    const text = container.textContent || "";
    expect(text).toMatch(/Privacy/);
    expect(text).not.toMatch(/Coming soon/i);
    expect(text).not.toMatch(/not wired yet/i);
    expect(text).not.toMatch(/Graph visibility/);
    expect(text).not.toMatch(/Needs per-Graph audience API/);
    expect(text).not.toMatch(/Exact location after join/);
    expect(text).not.toMatch(/Public engagement counts/);
    expect(text).not.toMatch(/Join requests/);
    expect(text).not.toMatch(/Blocked & muted/);
    writeFileSync(join(OUT, "privacy_render.txt"), text);
  });

  it("Feed & discovery hides blocked rows and has zero Coming soon", async () => {
    await act(async () => {
      root.render(
        <YouSettingsDestination
          setting="feed-discovery"
          onBack={() => undefined}
          session={null}
        />,
      );
    });
    const text = container.textContent || "";
    expect(text).toMatch(/Feed & discovery/);
    expect(text).not.toMatch(/Coming soon/i);
    expect(text).not.toMatch(/not wired yet/i);
    expect(text).not.toMatch(/People you know first/);
    expect(text).not.toMatch(/Local discovery/);
    expect(text).not.toMatch(/Nearby range/);
    expect(text).not.toMatch(/Suggested people/);
    expect(text).not.toMatch(/Suggested experiences/);
    expect(text).not.toMatch(/Feed ranking prefs/);
    writeFileSync(join(OUT, "feed_render.txt"), text);
  });
});
