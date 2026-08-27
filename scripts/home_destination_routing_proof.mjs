#!/usr/bin/env node
/**
 * Home tap → Figma destination identity proof (click rendered assets).
 * HOLD. DO NOT MERGE. DO NOT START LIVE.
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
  const routing = { total: 0, correct: 0, failed: 0, rows: [] };
  const visual = { total: 0, passed: 0, failed: 0, rows: [] };
  const backRestore = { total: 0, passed: 0, failed: 0 };
  const homeRoot = { total: 0, passed: 0, failed: 0 };

  const markRoute = (name, ok, detail) => {
    routing.total += 1;
    if (ok) routing.correct += 1;
    else routing.failed += 1;
    routing.rows.push({ name, ok, detail });
    console.log(`${ok ? "ROUTE_PASS" : "ROUTE_FAIL"} ${name}`);
  };
  const markVisual = (name, ok, detail) => {
    visual.total += 1;
    if (ok) visual.passed += 1;
    else visual.failed += 1;
    visual.rows.push({ name, ok, detail });
    console.log(`${ok ? "VIS_PASS" : "VIS_FAIL"} ${name}`);
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  try {
    await login(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(800);
    await page.waitForSelector('[data-testid="graph-social-home"]');
    const home = page.locator('[data-testid="graph-social-home"]');

    // --- Open Graph from Conversation card ---
    await home.evaluate((el) => {
      el.scrollTop = 0;
    });
    await sleep(200);
    const openGraph = page.locator('[data-testid^="gsh-open-graph-"]').first();
    await openGraph.click();
    await sleep(700);
    const graphSheet = page.getByTestId("graph-detail-sheet");
    markRoute(
      "conversation_open_graph",
      await graphSheet.isVisible().catch(() => false),
      await graphSheet.getAttribute("data-figma-node").catch(() => null),
    );
    markVisual(
      "graph_detail_identity",
      (await graphSheet.getAttribute("data-screen")) === "graph-detail" &&
        (await graphSheet.getAttribute("data-figma-node")) === "373:385",
    );
    await page.screenshot({
      path: resolve(OUT, "runtime/RUNTIME_GRAPH_DETAIL.png"),
      fullPage: false,
    });

    // Back restore
    backRestore.total += 1;
    await page.getByTestId("graph-detail-back").click();
    await sleep(500);
    const homeAfterBack = await page.getByTestId("graph-social-home").isVisible().catch(() => false);
    if (homeAfterBack) backRestore.passed += 1;
    else backRestore.failed += 1;

    // --- Memory media → 437:3 ---
    const media = page.locator('[data-testid^="gsh-media-seed-"]').first();
    if (await media.count()) {
      await media.scrollIntoViewIfNeeded();
      await media.click();
      await sleep(700);
      const mem = page.getByTestId("memory-detail-sheet");
      markRoute(
        "memory_media_to_437_3",
        await mem.isVisible().catch(() => false),
        await mem.getAttribute("data-figma-node").catch(() => null),
      );
      markVisual(
        "memory_detail_identity",
        (await mem.getAttribute("data-screen")) === "social-memory-detail" &&
          (await mem.getAttribute("data-figma-node")) === "437:3",
      );
      markVisual(
        "memory_has_title_Memory",
        /Memory/.test((await mem.locator("h1").textContent()) || ""),
      );
      markVisual(
        "memory_no_header_x_close",
        (await mem.locator(".social-sheet-close").count()) === 0,
      );
      await page.screenshot({
        path: resolve(OUT, "runtime/RUNTIME_437_3_MEMORY_DETAIL.png"),
        fullPage: false,
      });

      // Comments from detail
      await page.getByTestId("memory-detail-comment").click();
      await sleep(600);
      const comments = page.getByTestId("memory-comments-sheet");
      markRoute(
        "comment_to_437_69",
        await comments.isVisible().catch(() => false),
        await comments.getAttribute("data-figma-node").catch(() => null),
      );
      markVisual(
        "comments_identity",
        (await comments.getAttribute("data-screen")) === "social-comments" &&
          (await comments.getAttribute("data-figma-node")) === "437:69",
      );
      markVisual(
        "comments_sheet_close_text",
        ((await page.getByTestId("memory-comments-back").textContent()) || "").includes("Close"),
      );
      markVisual(
        "comments_modal_sheet_present",
        (await page.getByTestId("comments-modal-sheet").count()) === 1,
      );
      await page.screenshot({
        path: resolve(OUT, "runtime/RUNTIME_437_69_COMMENTS.png"),
        fullPage: false,
      });

      // Back from comments
      backRestore.total += 1;
      await page.getByTestId("memory-comments-back").click();
      await sleep(500);
      if (await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false)) {
        backRestore.passed += 1;
      } else backRestore.failed += 1;

      // Forward from memory detail
      await page.getByTestId("memory-detail-forward").click();
      await sleep(600);
      const fwd = page.getByTestId("forward-share-picker");
      markRoute(
        "forward_to_437_133",
        await fwd.isVisible().catch(() => false),
        await fwd.getAttribute("data-figma-node").catch(() => null),
      );
      markVisual(
        "forward_identity_send_to",
        (await fwd.getAttribute("data-screen")) === "social-forward" &&
          (await fwd.getAttribute("data-figma-node")) === "437:133" &&
          /Send to/.test((await fwd.locator("h1").textContent()) || ""),
      );
      markVisual(
        "forward_has_separately_together",
        (await page.getByTestId("forward-mode-separately").count()) === 1 &&
          (await page.getByTestId("forward-mode-together").count()) === 1,
      );
      await page.screenshot({
        path: resolve(OUT, "runtime/RUNTIME_437_133_FORWARD.png"),
        fullPage: false,
      });

      // Home root from nested Forward
      homeRoot.total += 1;
      await page.getByTestId("member-tab-home").click();
      await sleep(700);
      const nestedGone =
        !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)) &&
        !(await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false)) &&
        (await page.getByTestId("graph-social-home").isVisible().catch(() => false));
      if (nestedGone) homeRoot.passed += 1;
      else homeRoot.failed += 1;
    } else {
      markRoute("memory_media_present", false, "no media control");
    }

    // Discovery
    await page.getByTestId("member-tab-home").click();
    await sleep(400);
    const discCta = page.locator('[data-kind="discovery"] [data-testid^="gsh-cta-"]').first();
    if (await discCta.count()) {
      await discCta.scrollIntoViewIfNeeded();
      await discCta.click();
      await sleep(700);
      const disc = page.getByTestId("discovery-detail-sheet");
      markRoute(
        "discovery_to_437_200",
        await disc.isVisible().catch(() => false),
        await disc.getAttribute("data-figma-node").catch(() => null),
      );
      markVisual(
        "discovery_identity",
        (await disc.getAttribute("data-screen")) === "social-discovery-detail" &&
          (await disc.getAttribute("data-figma-node")) === "437:200",
      );
      markVisual(
        "discovery_has_graph_this",
        (await page.getByTestId("discovery-graph-this").count()) === 1,
      );
      await page.screenshot({
        path: resolve(OUT, "runtime/RUNTIME_437_200_DISCOVERY.png"),
        fullPage: false,
      });
      homeRoot.total += 1;
      await page.getByTestId("member-tab-home").click();
      await sleep(500);
      if (!(await disc.isVisible().catch(() => false))) homeRoot.passed += 1;
      else homeRoot.failed += 1;
    } else {
      markRoute("discovery_cta_present", false, "no discovery cta");
    }

    // Story
    const story = page.locator('[data-testid^="gsh-story-story-"]').first();
    if (await story.count()) {
      await home.evaluate((el) => {
        el.scrollTop = 0;
      });
      await story.click();
      await sleep(600);
      const sv = page.getByTestId("story-viewer");
      markRoute(
        "story_to_357_418",
        await sv.isVisible().catch(() => false),
        await sv.getAttribute("data-figma-node").catch(() => null),
      );
      await page.getByTestId("story-viewer-close").click();
      await sleep(400);
    }

    // Search gap
    markRoute(
      "search_entry_on_home",
      false,
      "NOT_IMPLEMENTED — Header 287:7 frozen; SEARCH-00 373:261 has no Home entry in current authority",
    );
  } finally {
    await browser.close();
  }

  const result = {
    at: new Date().toISOString(),
    homeOverall: "MAJOR_DIFF",
    homeActionDestinationFidelity: "MAJOR_DIFF",
    homeInteractionGate: "NOT_CLOSED",
    routing,
    visualIdentity: visual,
    backRestore,
    homeRoot,
    verdict: "HOLD_HOME_DESTINATION_CORRECTION",
    permissionToStartLive: "NO",
  };
  writeFileSync(resolve(OUT, "HOME_DESTINATION_ROUTING_PROOF.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(routing.failed && routing.failed > 2 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
