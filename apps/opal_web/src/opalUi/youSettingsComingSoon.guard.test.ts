/**
 * Screenshot-bug + Pass B regression: Feed & discovery + Privacy must never
 * show "Coming soon", and blocked inventory must not paint to consumers.
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
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:${key}|"${key}"):\\s*\\{([\\s\\S]*?)\\n\\s*(?:[a-zA-Z"][\\w-]*"|[a-zA-Z_][\\w-]*):\\s*\\{`,
    "m",
  );
  const m = code.match(re);
  expect(m, `screen ${key} not found`).toBeTruthy();
  return m![1];
}

describe("You settings — zero Coming soon + Pass B hide", () => {
  it("has no user-facing Coming soon anywhere in YouSettingsDestination", () => {
    expect(code).not.toMatch(/Coming soon/i);
    expect(code).not.toMatch(/comingSoon\s*:/);
    expect(code).not.toMatch(/next build/i);
  });

  it("Spending / Fit inventory: blockedReason rows exist; no architecture-note paint ids", () => {
    const spending = screenBlock("spending");
    expect(spending).toMatch(/title:\s*"Spending"/);
    expect(spending).not.toContain('id: "spending-live"');
    expect(spending).not.toContain('id: "spending-law"');
    for (const id of ["learn-choices", "budget-private", "ask-when-cost", "trip-goals", "per-graph-spend"]) {
      expect(spending).toContain(`id: "${id}"`);
      const rowRe = new RegExp(
        `id:\\s*"${id}"[\\s\\S]{0,220}?blockedReason:\\s*"[^"]+"|blockedReason:\\s*"[^"]+"[\\s\\S]{0,220}?id:\\s*"${id}"`,
      );
      expect(spending, `${id} missing blockedReason`).toMatch(rowRe);
    }
    const fit = screenBlock("fit");
    expect(fit).toMatch(/title:\s*"Fit"/);
    expect(fit).not.toContain('id: "fit-scope"');
    expect(fit).not.toContain('id: "fit-empty"');
    for (const id of ["share-activity-prefs", "wellness-goals"]) {
      expect(fit).toContain(`id: "${id}"`);
      const rowRe = new RegExp(
        `id:\\s*"${id}"[\\s\\S]{0,220}?blockedReason:\\s*"[^"]+"|blockedReason:\\s*"[^"]+"[\\s\\S]{0,220}?id:\\s*"${id}"`,
      );
      expect(fit, `${id} missing blockedReason`).toMatch(rowRe);
    }
    expect(code).toMatch(/blockedReason" in row && row\.blockedReason\) return null/);
  });

  it("Privacy inventory keeps blockedReason data but render skips blocked rows", () => {
    const block = screenBlock("privacy");
    expect(block).toMatch(/title:\s*"Privacy"/);
    for (const id of [
      "graph-visibility",
      "exact-location",
      "public-counts",
      "join-requests",
      "blocked-muted",
    ]) {
      expect(block).toContain(`id: "${id}"`);
      const rowRe = new RegExp(
        `id:\\s*"${id}"[\\s\\S]{0,220}?blockedReason:\\s*"[^"]+"|blockedReason:\\s*"[^"]+"[\\s\\S]{0,220}?id:\\s*"${id}"`,
      );
      expect(block, `${id} missing blockedReason`).toMatch(rowRe);
    }
    expect(code).toMatch(/blockedReason" in row && row\.blockedReason\) return null/);
    expect(block).not.toMatch(/Coming soon/i);
  });

  it("Feed & discovery inventory keeps blockedReason; nearby-range not pretend-live", () => {
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
    const nearbyObj = block.match(/\{[^{}]*id:\s*"nearby-range"[^{}]*\}/);
    expect(nearbyObj?.[0], "nearby-range object").toBeTruthy();
    expect(nearbyObj![0]).toMatch(/blockedReason:\s*"Needs discovery-distance preference API/);
    expect(nearbyObj![0]).not.toContain('value: "25 mi"');
    expect(block).not.toMatch(/Coming soon/i);
  });
});
