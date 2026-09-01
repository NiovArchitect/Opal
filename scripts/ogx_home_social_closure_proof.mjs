/**
 * HISTORICAL ONLY — B6 RETIRED FROM CURRENT EXECUTABLE SET.
 *
 * Home production hydration + social action closure browser proof.
 * HOLD. DO NOT MERGE.
 *
 * Contains stale assert data-figma-create === "149:31".
 * Current Create = 863:284/863:338 via prove_b4_create.mjs.
 * Home formal = B5.5 top-844 proof (do not reopen product for this script).
 * Set OPAL_RUN_HISTORICAL=1 to re-execute for lineage archaeology only.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "./founder_proof_fixture.mjs";

if (process.env.OPAL_RUN_HISTORICAL !== "1") {
  console.error(
    JSON.stringify(
      {
        status: "RETIRED_HISTORICAL",
        square: "B6",
        script: "ogx_home_social_closure_proof.mjs",
        reason: "Asserts legacy Create 149:31; Home formal closed in B5.5",
        current_create_proof: "apps/opal_web/scripts/prove_b4_create.mjs",
        current_home_proof: "docs/evidence/v2-coded-experience/p0-05-12-wave-b/B5_5_CLOSURE_PROOF.json",
        hint: "OPAL_RUN_HISTORICAL=1 to run lineage-only",
      },
      null,
      2,
    ),
  );
  process.exit(3);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/shots/home-social-closure",
);
const EVIDENCE = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence",
);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(800);
  if (await page.getByTestId("fr00-already-account").isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
  } else if (await page.getByTestId("fr00-skip-intro").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-skip-intro").click();
    await sleep(400);
    if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-already-account").click();
    } else if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-continue-phone").click();
    }
  }
  await sleep(500);
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/product/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 20000 });
  if (await page.getByTestId("fr06-phone-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr06-phone-input"]', "+12025550101");
  } else await page.fill("#phone", "+12025550101");
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  if (await page.getByTestId("fr06-continue").isVisible().catch(() => false)) {
    await page.getByTestId("fr06-continue").click();
  } else {
    await page.getByRole("button", { name: /Text me a code/i }).first().click();
  }
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(400);
  if (await page.getByTestId("fr07-code-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr07-code-input"]', devCode);
    await page.getByTestId("fr07-submit").click();
  } else {
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify/i }).first().click();
  }
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) break;
    await sleep(250);
  }
  if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const v = await page.getByTestId("fr08-name-input").inputValue().catch(() => "");
      if (!v) await page.fill('[data-testid="fr08-name-input"]', "Founder Review");
    }
    for (let i = 0; i < 30; i++) {
      const btn = page.getByTestId("fr08-continue");
      if (!(await btn.isDisabled().catch(() => true))) {
        await btn.click();
        break;
      }
      await sleep(200);
    }
  }
  for (let i = 0; i < 20; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
      await sleep(300);
      continue;
    }
    await sleep(300);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 });
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    web: WEB,
    founderResetUrl: `${WEB}/?opal_reset_first_run=1`,
    assertions: {},
    shots: {},
    verdict: "HOLD",
  };
  let passed = 0;
  let failed = 0;
  const assert = (name, ok) => {
    result.assertions[name] = !!ok;
    if (ok) passed += 1;
    else failed += 1;
  };

  await activate({
    phone: "+12025550101",
    name: "Founder Review",
    handle: "founder_rev",
    code: "111111",
  }).catch(() => {});

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    await login(page);

    const home = page.getByTestId("graph-social-home");
    assert("home_visible", await home.isVisible().catch(() => false));
    assert("figma_287_6", (await home.getAttribute("data-figma-home")) === "287:6");
    assert("home_status_core", (await home.getAttribute("data-home-status")) === "ogx-home-core");
    assert("home_mode_fixture_or_prod", ["FOUNDER_FIXTURE", "PRODUCTION_HYDRATION"].includes(await home.getAttribute("data-home-mode")));
    assert("no_permanent_plus", (await page.getByTestId("member-tabbar").getAttribute("data-create-dock")) === "deferred");
    assert("opal_rest", (await page.getByTestId("member-tab-opal").getAttribute("data-opal-state")) === "rest");
    const feedCount = Number(await home.getAttribute("data-home-feed-count") || "0");
    assert("feed_count_ge_20", feedCount >= 20);
    await page.screenshot({ path: resolve(OUT, "A_HOME_TOP.png") });
    result.shots.A = "A_HOME_TOP.png";

    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="graph-social-home"]');
      if (el) el.scrollTop = 900;
    });
    await sleep(400);
    await page.screenshot({ path: resolve(OUT, "B_HOME_MID.png") });
    result.shots.B = "B_HOME_MID.png";

    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="graph-social-home"]');
      if (el) el.scrollTop = 2400;
    });
    await sleep(400);
    await page.screenshot({ path: resolve(OUT, "C_HOME_DEEP.png") });
    result.shots.C = "C_HOME_DEEP.png";

    // Memory detail
    const memMedia = page.locator('[data-testid^="gsh-media-seed-"][data-mode="active"]').first();
    if (await memMedia.isVisible().catch(() => false)) {
      await memMedia.click();
      await sleep(500);
    } else {
      // fallback: open first memory card media via filter
      await page.getByTestId("gsh-filter-memory").click();
      await sleep(300);
      await page.locator('[data-testid^="gsh-media-"]').first().click().catch(() => {});
      await sleep(500);
    }
    assert("memory_detail", await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "D_MEMORY_DETAIL.png") });
    result.shots.D = "D_MEMORY_DETAIL.png";

    if (await page.getByTestId("memory-detail-comment").isVisible().catch(() => false)) {
      await page.getByTestId("memory-detail-comment").click();
      await sleep(400);
    }
    assert("comments", await page.getByTestId("memory-comments-sheet").isVisible().catch(() => false));
    if (await page.getByTestId("memory-comments-input").isVisible().catch(() => false)) {
      await page.fill('[data-testid="memory-comments-input"]', "Looks amazing");
      await page.getByTestId("memory-comments-submit").click();
      await sleep(300);
    }
    await page.screenshot({ path: resolve(OUT, "E_COMMENTS.png") });
    result.shots.E = "E_COMMENTS.png";
    if (await page.getByTestId("memory-comments-back").isVisible().catch(() => false)) {
      await page.getByTestId("memory-comments-back").click();
      await sleep(300);
    }

    if (await page.getByTestId("memory-detail-forward").isVisible().catch(() => false)) {
      await page.getByTestId("memory-detail-forward").click();
      await sleep(400);
    }
    assert("forward_picker", await page.getByTestId("forward-share-picker").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "F_FORWARD.png") });
    result.shots.F = "F_FORWARD.png";
    if (await page.getByTestId("forward-back").isVisible().catch(() => false)) {
      await page.getByTestId("forward-back").click();
      await sleep(300);
    }
    if (await page.getByTestId("memory-detail-back").isVisible().catch(() => false)) {
      await page.getByTestId("memory-detail-back").click();
      await sleep(400);
    }
    assert("back_to_home", await page.getByTestId("graph-social-home").isVisible().catch(() => false));

    // Story
    await page.getByTestId("gsh-filter-all").click().catch(() => {});
    await sleep(200);
    const story = page.locator('[data-testid^="gsh-story-story-"]').first();
    if (await story.isVisible().catch(() => false)) {
      await story.click();
      await sleep(400);
    }
    assert("story_viewer", await page.getByTestId("story-viewer").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "G_STORY_VIEWER.png") });
    result.shots.G = "G_STORY_VIEWER.png";
    if (await page.getByTestId("story-viewer-close").isVisible().catch(() => false)) {
      await page.getByTestId("story-viewer-close").click();
      await sleep(300);
    }
    await page.getByTestId("gsh-story-create").click();
    await sleep(400);
    assert("story_create", await page.getByTestId("story-create-flow").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "H_STORY_CREATE.png") });
    result.shots.H = "H_STORY_CREATE.png";
    if (await page.getByTestId("story-create-back").isVisible().catch(() => false)) {
      await page.getByTestId("story-create-back").click();
      await sleep(300);
    }

    // Ensure Home clear of overlays before remaining destinations
    for (const id of [
      "story-create-back",
      "story-viewer-close",
      "memory-detail-back",
      "memory-comments-back",
      "forward-back",
      "discovery-detail-back",
      "graph-detail-back",
    ]) {
      if (await page.getByTestId(id).isVisible({ timeout: 200 }).catch(() => false)) {
        await page.getByTestId(id).click({ force: true }).catch(() => {});
        await sleep(200);
      }
    }
    await page.getByTestId("member-tab-home").click({ force: true }).catch(() => {});
    await sleep(400);

    // Discovery — scroll into view then open CTA
    await page.getByTestId("gsh-filter-all").click().catch(() => {});
    await sleep(200);
    const disc = page.getByTestId("gsh-cta-seed-discovery-local-pottery");
    await disc.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(200);
    await disc.click();
    await page.getByTestId("discovery-detail-sheet").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    assert("discovery_detail", await page.getByTestId("discovery-detail-sheet").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "I_DISCOVERY.png") });
    result.shots.I = "I_DISCOVERY.png";
    if (await page.getByTestId("discovery-detail-back").isVisible().catch(() => false)) {
      await page.getByTestId("discovery-detail-back").click();
      await sleep(300);
    }

    // Profile from feed
    const personBtn = page.locator('[data-testid^="gsh-person-"]').first();
    if (await personBtn.isVisible().catch(() => false)) {
      await personBtn.click();
      await sleep(500);
    }
    assert("profile", await page.getByTestId("graph-profile-page").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "J_PROFILE.png") });
    result.shots.J = "J_PROFILE.png";
    await page.getByRole("button", { name: "Back" }).first().click().catch(() => {});
    await sleep(400);
    assert("scroll_restore_home", await page.getByTestId("graph-social-home").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "K_BACK_HOME.png") });
    result.shots.K = "K_BACK_HOME.png";

    // Graph detail — explicit open-graph control
    await page.getByTestId("gsh-filter-graph").click();
    await sleep(300);
    const openGraph = page.getByTestId("gsh-open-graph-seed-jordan-market");
    await openGraph.scrollIntoViewIfNeeded().catch(() => {});
    await openGraph.click();
    await page.getByTestId("graph-detail-sheet").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    assert("graph_detail", await page.getByTestId("graph-detail-sheet").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "L_GRAPH_DETAIL.png") });
    result.shots.L = "L_GRAPH_DETAIL.png";
    if (await page.getByTestId("graph-detail-back").isVisible().catch(() => false)) {
      await page.getByTestId("graph-detail-back").click();
      await sleep(300);
    }

    // Live
    await page.getByTestId("gsh-filter-live").click();
    await sleep(300);
    const liveCta = page.getByTestId("gsh-cta-seed-live-sabrina");
    await liveCta.click();
    await page.getByTestId("live-surface-overlay").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    assert("live_surface", await page.getByTestId("live-surface-overlay").isVisible().catch(() => false));
    await page.screenshot({ path: resolve(OUT, "M_LIVE.png") });
    result.shots.M = "M_LIVE.png";

    // Close Live overlay if open, then prior gates
    if (await page.getByTestId("live-surface-overlay").isVisible().catch(() => false)) {
      await page.locator('[data-testid="live-surface-overlay"] .btn.ghost').first().click().catch(() => {});
      await sleep(300);
    }
    await page.getByTestId("member-tab-chats").click({ force: true });
    await sleep(400);
    assert("chats_00", await page.getByTestId("chats-home").isVisible().catch(() => false));
    await page.getByTestId("member-tab-graphs").click({ force: true });
    await sleep(400);
    await page.getByTestId("graphs-create").click({ force: true });
    await page.getByTestId("graph-create-flow").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    assert(
      "create_149",
      (await page.getByTestId("graph-create-flow").getAttribute("data-figma-create").catch(() => null)) ===
        "149:31",
    );

    result.browserAssertions = { passed, failed, total: passed + failed };
    result.verdict = failed === 0 ? "HOLD_HOME_SOCIAL_PASS" : "HOLD_HOME_SOCIAL_PARTIAL";
    writeFileSync(resolve(EVIDENCE, "BROWSER_PROOF_HOME_SOCIAL_CLOSURE.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
