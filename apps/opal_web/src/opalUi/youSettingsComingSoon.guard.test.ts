/**
 * Screenshot-bug regression: Feed & discovery + Privacy & audience must never
 * show user-facing "Coming soon". Honest blockedReason only.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const youSrc = readFileSync(join(here, "YouSettingsDestination.tsx"), "utf8");

/** Strip block + line comments so doc comments don't count as UI copy. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const code = stripComments(youSrc);

function screenBlock(key: string): string {
  // Match `privacy: {` or `"feed-discovery": {` through the next top-level screen key.
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:${key}|"${key}"):\\s*\\{([\\s\\S]*?)\\n\\s*(?:[a-zA-Z"][\\w-]*"|[a-zA-Z_][\\w-]*):\\s*\\{`,
    "m",
  );
  const m = code.match(re);
  expect(m, `screen ${key} not found`).toBeTruthy();
  return m![1];
}

describe("You settings — zero Coming soon (screenshot bug 1)", () => {
  it("has no user-facing Coming soon anywhere in YouSettingsDestination", () => {
    expect(code).not.toMatch(/Coming soon/i);
    expect(code).not.toMatch(/comingSoon\s*:/);
  });

  it("Privacy & audience rows use honest blockedReason", () => {
    const block = screenBlock("privacy");
    expect(block).toMatch(/title:\s*"Privacy & audience"/);
    for (const id of [
      "graph-visibility",
      "exact-location",
      "public-counts",
      "join-requests",
      "blocked-muted",
    ]) {
      expect(block).toContain(`id: "${id}"`);
      // Each listed row must carry blockedReason in the same object literal vicinity.
      const rowRe = new RegExp(
        `id:\\s*"${id}"[\\s\\S]{0,220}?blockedReason:\\s*"[^"]+"|blockedReason:\\s*"[^"]+"[\\s\\S]{0,220}?id:\\s*"${id}"`,
      );
      expect(block, `${id} missing blockedReason`).toMatch(rowRe);
    }
    expect(block).not.toMatch(/Coming soon/i);
  });

  it("Feed & discovery rows use honest blockedReason", () => {
    const block = screenBlock("feed-discovery");
    expect(block).toMatch(/title:\s*"Feed & discovery"/);
    for (const id of [
      "people-first",
      "local-discovery",
      "suggested-people",
      "suggested-experiences",
    ]) {
      expect(block).toContain(`id: "${id}"`);
      const rowRe = new RegExp(
        `id:\\s*"${id}"[\\s\\S]{0,220}?blockedReason:\\s*"[^"]+"|blockedReason:\\s*"[^"]+"[\\s\\S]{0,220}?id:\\s*"${id}"`,
      );
      expect(block, `${id} missing blockedReason`).toMatch(rowRe);
    }
    // nearby-range is informational LIVE (fixed 25 mi): value, no blocker.
    const nearbyObj = block.match(/\{[^{}]*id:\s*"nearby-range"[^{}]*\}/);
    expect(nearbyObj?.[0], "nearby-range object").toBeTruthy();
    expect(nearbyObj![0]).toContain('value: "25 mi"');
    expect(nearbyObj![0]).not.toMatch(/blockedReason/);
    expect(block).not.toMatch(/Coming soon/i);
  });
});
