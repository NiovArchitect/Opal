/**
 * BUG 1 render proof — Privacy & Feed screens show blockedReason, never Coming soon.
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
  it("Privacy & audience has zero Coming soon and honest blockers", async () => {
    await act(async () => {
      root.render(
        <YouSettingsDestination setting="privacy" onBack={() => undefined} session={null} />,
      );
    });
    const text = container.textContent || "";
    expect(text).toMatch(/Privacy & audience/);
    expect(text).not.toMatch(/Coming soon/i);
    expect(text).toMatch(/Graph visibility/);
    expect(text).toMatch(/Needs per-Graph audience API/);
    expect(text).toMatch(/Exact location after join/);
    expect(text).toMatch(/Public engagement counts/);
    expect(text).toMatch(/Join requests/);
    expect(text).toMatch(/Blocked & muted/);
    writeFileSync(join(OUT, "privacy_render.txt"), text);
  });

  it("Feed & discovery has zero Coming soon and honest blockers", async () => {
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
    expect(text).toMatch(/People you know first/);
    expect(text).toMatch(/Local discovery/);
    expect(text).toMatch(/Nearby range/);
    expect(text).toMatch(/Suggested people/);
    expect(text).toMatch(/Suggested experiences/);
    expect(text).toMatch(/Feed ranking prefs|discovery|Suggested/i);
    writeFileSync(join(OUT, "feed_render.txt"), text);
  });
});
