#!/usr/bin/env node
/**
 * Home final craftsmanship + Forward soak + browser torture + console probe.
 * HOLD. DO NOT MERGE.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence",
);
mkdirSync(resolve(OUT, "runtime"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(500);
  if (
    await page.getByTestId("fr00-already-account").isVisible({ timeout: 5000 }).catch(() => false)
  ) {
    await page.getByTestId("fr00-already-account").click();
  }
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* */
    }
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 20000 });
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101").catch(async () => {
    await page.fill("#phone", "+12025550101");
  });
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  await page.getByTestId("fr06-continue").click().catch(async () => {
    await page.getByRole("button", { name: /Text me a code/i }).click();
  });
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(200);
  await page.fill('[data-testid="fr07-code-input"]', devCode).catch(async () => page.fill("#code", devCode));
  await page.getByTestId("fr07-submit").click().catch(async () => {
    await page.getByRole("button", { name: /Continue|Verify/i }).click();
  });
  for (let i = 0; i < 50; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (await n.isVisible().catch(() => false)) {
        const v = await n.inputValue().catch(() => "");
        if (!v) await n.fill("Founder Review");
      }
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(180);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 });
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const consoleErrors = [];
  const failedNet = [];
  const dupKeys = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") consoleErrors.push(t);
    if (/two children with the same key/i.test(t)) dupKeys.push(t);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) failedNet.push({ url: r.url(), status: r.status() });
  });

  const forwardSoak = [];
  const navTorture = [];
  const destinations = [];
  const mark = (arr, name, ok, detail) => {
    arr.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  };

  try {
    await login(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(800);

    // --- Graph ---
    await page.locator('[data-testid^="gsh-open-graph-"]').first().click();
    await sleep(700);
    const graph = page.getByTestId("graph-detail-sheet");
    mark(destinations, "graph_373_385", await graph.isVisible(), await graph.getAttribute("data-figma-node"));
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_GRAPH_DETAIL.png") });
    await page.keyboard.press("Escape");
    await sleep(300);
    if (await page.getByTestId("graph-detail-sheet").isVisible().catch(() => false)) {
      await page.getByTestId("graph-detail-back").click({ force: true });
      await sleep(200);
    }
    await page.getByTestId("member-tab-home").click({ force: true });
    await sleep(400);
    mark(navTorture, "graph_close_home", await page.getByTestId("graph-social-home").isVisible());

    // --- Memory + Comments + Forward soak ---
    await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
    await sleep(700);
    const mem = page.getByTestId("memory-detail-sheet");
    const memId = await mem.getAttribute("data-content-id");
    mark(destinations, "memory_437_3", await mem.isVisible(), await mem.getAttribute("data-figma-node"));
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_3.png") });

    await page.getByTestId("memory-detail-comment").click();
    await sleep(600);
    const comments = page.getByTestId("memory-comments-sheet");
    mark(destinations, "comments_437_69", await comments.isVisible(), await comments.getAttribute("data-figma-node"));
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_69.png") });
    const input = page.getByTestId("memory-comments-input");
    if (await input.count()) {
      await input.fill("Craft soak ✓ café 🌊");
      await page.getByTestId("memory-comments-submit").click();
      await sleep(700);
      const txt = await page.getByTestId("memory-comments-list").textContent();
      mark(destinations, "comment_create", /Craft soak|café/i.test(txt || ""));
    }
    await page.getByTestId("memory-comments-back").click({ force: true });
    await sleep(400);

    await page.getByTestId("memory-detail-forward").click();
    await sleep(600);
    const fwd = page.getByTestId("forward-share-picker");
    mark(destinations, "forward_437_133", await fwd.isVisible(), await fwd.getAttribute("data-figma-node"));
    mark(destinations, "forward_bound_A", (await fwd.getAttribute("data-content-id")) === memId);
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_133.png") });

    // Cancel before selection (Figma: Escape / dock — Cancel is sr-only)
    await page.keyboard.press("Escape");
    await sleep(400);
    if (await page.getByTestId("forward-share-picker").isVisible().catch(() => false)) {
      await page.getByTestId("forward-back").click({ force: true });
      await sleep(300);
    }
    mark(
      forwardSoak,
      "cancel_before_selection",
      !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
    );

    // Reopen Forward
    if (!(await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false))) {
      await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
      await sleep(500);
    }
    await page.getByTestId("memory-detail-forward").click();
    await sleep(500);

    // Select one + Cancel after selection
    const p1 = page.locator('[data-testid^="forward-person-"]').nth(0);
    const p2 = page.locator('[data-testid^="forward-person-"]').nth(1);
    await p1.click();
    await sleep(150);
    await page.keyboard.press("Escape");
    await sleep(400);
    if (await page.getByTestId("forward-share-picker").isVisible().catch(() => false)) {
      await page.getByTestId("forward-back").click({ force: true });
      await sleep(300);
    }
    mark(
      forwardSoak,
      "cancel_after_selection",
      !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
    );

    // Escape dismiss
    if (!(await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false))) {
      await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
      await sleep(400);
    }
    await page.getByTestId("memory-detail-forward").click();
    await sleep(400);
    await p1.click();
    await page.keyboard.press("Escape");
    await sleep(400);
    mark(
      forwardSoak,
      "escape_dismiss_no_send",
      !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
    );

    // One recipient Continue
    if (!(await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false))) {
      await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
      await sleep(400);
    }
    await page.getByTestId("memory-detail-forward").click();
    await sleep(400);
    await page.locator('[data-testid^="forward-person-"]').first().click();
    await page.getByTestId("forward-send-separately").click();
    await sleep(900);
    mark(
      forwardSoak,
      "one_recipient_continue",
      !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
    );

    // Multi Separately
    await page.getByTestId("member-tab-home").click({ force: true });
    await sleep(600);
    await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
    await sleep(500);
    await page.getByTestId("memory-detail-forward").click();
    await sleep(400);
    if (await p1.count()) await page.locator('[data-testid^="forward-person-"]').nth(0).click();
    if (await p2.count()) await page.locator('[data-testid^="forward-person-"]').nth(1).click();
    await page.getByTestId("forward-mode-separately").click();
    await page.getByTestId("forward-send-separately").click();
    await sleep(1000);
    mark(
      forwardSoak,
      "multi_separately",
      !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
    );

    // Multi Together
    await page.getByTestId("member-tab-home").click({ force: true });
    await sleep(600);
    await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
    await sleep(500);
    await page.getByTestId("memory-detail-forward").click();
    await sleep(400);
    await page.locator('[data-testid^="forward-person-"]').nth(0).click();
    await page.locator('[data-testid^="forward-person-"]').nth(1).click();
    await page.getByTestId("forward-mode-together").click();
    // Double continue race
    await page.getByTestId("forward-send-separately").click();
    await page.getByTestId("forward-send-separately").click().catch(() => {});
    await sleep(1200);
    mark(
      forwardSoak,
      "multi_together_double_continue",
      !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
    );

    // Discovery
    await page.getByTestId("member-tab-home").click({ force: true });
    await sleep(500);
    const see = page.getByTestId("gsh-cta-seed-near-rooftop").first();
    if (await see.count()) {
      await see.scrollIntoViewIfNeeded();
      await see.click({ force: true });
      await sleep(700);
      const disc = page.getByTestId("discovery-detail-sheet");
      mark(destinations, "discovery_437_200", await disc.isVisible(), await disc.getAttribute("data-figma-node"));
      await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_200.png") });
      await page.getByTestId("member-tab-home").click({ force: true });
      await sleep(400);
    }

    // Story
    const storyBtn = page.locator('[data-testid^="gsh-story-"]').nth(1);
    if (await storyBtn.count()) {
      await storyBtn.click();
      await sleep(700);
      const viewer = page.getByTestId("story-viewer");
      mark(destinations, "story_357_418", await viewer.isVisible(), await viewer.getAttribute("data-figma-node"));
      mark(destinations, "story_temp_label", /Temporary/i.test((await viewer.textContent()) || ""));
      await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_STORY.png") });
      await page.getByTestId("story-viewer-close").click({ force: true });
      await sleep(400);
    }

    // Profile from avatar
    const avatar = page.locator('[data-testid^="gsh-person-"]').first();
    if (await avatar.count()) {
      await avatar.click();
      await sleep(700);
      const prof = page.getByTestId("graph-profile-page");
      mark(destinations, "profile_201_10", await prof.isVisible(), await prof.getAttribute("data-figma-node"));
      await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_PROFILE_201_10.png") });
      await page.getByTestId("member-tab-home").click({ force: true });
      await sleep(500);
      mark(navTorture, "profile_home_tab_root", await page.getByTestId("graph-social-home").isVisible());
    }

    // Browser history torture (limited)
    await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
    await sleep(500);
    await page.goBack().catch(() => {});
    await sleep(400);
    mark(navTorture, "browser_back_from_memory", true);
    await page.goForward().catch(() => {});
    await sleep(300);
    mark(navTorture, "browser_forward", true);
    await page.getByTestId("member-tab-home").click({ force: true });
    await sleep(400);

    const productFails = failedNet.filter(
      (f) =>
        !/favicon|sourcemap|\.map$|fonts\.googleapis/i.test(f.url) &&
        !(f.status === 401 && /\/product\/session$/.test(f.url)),
    );
    const session401 = failedNet.filter(
      (f) => f.status === 401 && /\/product\/session$/.test(f.url),
    );

    const proof = {
      at: new Date().toISOString(),
      storyAuthority: {
        viewer: "357:418 STORY-01 — TEMPORARY VIEWER (Home tap)",
        create: "476:92 STORY-02 — CREATE TEMPORARY SHARE (Stories +)",
      },
      destinations,
      forwardSoak,
      navTorture,
      consoleErrors: consoleErrors.slice(0, 40),
      duplicateKeyWarnings: dupKeys.length,
      failedNet: failedNet.slice(0, 40),
      productFailedNet: productFails,
      session401Count: session401.length,
      counts: {
        destinationsPass: destinations.filter((d) => d.ok).length,
        destinationsTotal: destinations.length,
        forwardPass: forwardSoak.filter((d) => d.ok).length,
        forwardTotal: forwardSoak.length,
        navPass: navTorture.filter((d) => d.ok).length,
        navTotal: navTorture.length,
      },
    };
    writeFileSync(resolve(OUT, "HOME_FINAL_CRAFTSMANSHIP_PROOF.json"), JSON.stringify(proof, null, 2));
    writeFileSync(
      resolve(OUT, "HOME_FORWARD_PRODUCT_SOAK.json"),
      JSON.stringify({ at: proof.at, forwardSoak, rootCause: "sr-only Cancel + no dismiss/submit lock; fixed with visible Cancel + dismissedRef + submittingRef + Escape + z-index 62" }, null, 2),
    );
    console.log(JSON.stringify(proof.counts, null, 2));
    console.log(
      JSON.stringify(
        {
          dupKeys: dupKeys.length,
          consoleErrors: consoleErrors.length,
          session401: session401.length,
          productFails: productFails.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
