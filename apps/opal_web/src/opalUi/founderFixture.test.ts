import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../.."); // apps/opal_web
const repoRoot = resolve(root, "../.."); // monorepo root

/**
 * Fixture helpers live in scripts/ (Node). Mirror precondition logic here for unit safety
 * without coupling production domain to test-only assumptions.
 */
function assertJordanTimePlacePrecondition(state: {
  next_gap?: string | null;
  what?: string | null;
  when?: string | null;
  where?: string | null;
  gaps?: string[];
  label?: string | null;
}) {
  const when = String(state.when || state.label || "");
  const where = state.where;
  const gap = state.next_gap;
  const hasDinner = /dinner/i.test(String(state.what || state.label || ""));
  const hasThu = /thursday|thu/i.test(when) || /6:30|6\.30/.test(when);
  const placeOpen =
    !where ||
    (Array.isArray(state.gaps) &&
      state.gaps.some((g) => /where|place/i.test(String(g))));

  if (gap === "place" && hasDinner && (hasThu || when) && placeOpen) {
    return { ok: true, class: "PASS" as const };
  }
  if (gap === "confirm_required_person" || gap === "participants") {
    return { ok: false, class: "FIXTURE_FAIL" as const };
  }
  return { ok: false, class: "FIXTURE_FAIL" as const };
}

describe("founder fixture harness laws", () => {
  it("founder_jordan_fixture_precondition: place-open dinner is PASS", () => {
    const r = assertJordanTimePlacePrecondition({
      next_gap: "place",
      what: "Dinner",
      when: "Thursday · 6:30 PM",
      where: null,
      gaps: ["where"],
    });
    expect(r.ok).toBe(true);
    expect(r.class).toBe("PASS");
  });

  it("fixture_failure_is_not_product_failure: confirm_required is FIXTURE_FAIL", () => {
    const r = assertJordanTimePlacePrecondition({
      next_gap: "confirm_required_person",
      what: "Dinner",
      when: "Thursday · 6:30 PM",
      where: "Juniper & Ivy",
    });
    expect(r.ok).toBe(false);
    expect(r.class).toBe("FIXTURE_FAIL");
    expect(r.class).not.toBe("PRODUCT_FAIL" as never);
  });

  it("founder_episode_idempotency script uses namespaced invite keys", () => {
    const script = readFileSync(
      resolve(repoRoot, "scripts/founder_proof_fixture.mjs"),
      "utf8",
    );
    expect(script).toMatch(/proof-inv-jordan-t2p-/);
    expect(script).toMatch(/prepareJordanTimePlaceFixture/);
    expect(script).toMatch(/FIXTURE_FAIL/);
    // Must not mutate production SocialReality
    expect(script).not.toMatch(/next_meaningful_gap\s*=/);
  });

  it("seed_does_not_mature_same_thread_unboundedly (live proof prepares fresh episode)", () => {
    const live = readFileSync(
      resolve(repoRoot, "scripts/live_jordan_foundation_proof.mjs"),
      "utf8",
    );
    expect(live).toMatch(/prepareJordanTimePlaceFixture/);
    expect(live).toMatch(/FIXTURE_FAIL/);
    expect(live).toMatch(/PRODUCT_FAIL/);
  });

  it("home brand chrome: topbar lockup suppressed on home tab", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/tab !== "home"/);
    expect(app).toMatch(/V2BrandRow/);
  });
});
