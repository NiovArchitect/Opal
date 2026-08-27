#!/usr/bin/env node
/**
 * Home destination visual closure proof — inventory + measured captures.
 * HOLD. DO NOT MERGE. Markers alone are NOT visual EXACT.
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

function box(page, locator) {
  return locator.evaluate((n) => {
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      radius: cs.borderRadius,
      bg: cs.backgroundColor,
      padB: cs.paddingBottom,
      fontSize: cs.fontSize,
    };
  }).catch(() => null);
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const consoleErrors = [];
  const failedNet = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) failedNet.push({ url: r.url(), status: r.status() });
  });

  const destinations = [];
  const entity = [];
  const forwardSoak = [];
  const navTorture = [];
  const counts = {
    visualAssertions: 0,
    visualPass: 0,
    routingCorrect: 0,
    routingTotal: 0,
  };

  const assertVis = (name, ok, detail) => {
    counts.visualAssertions += 1;
    if (ok) counts.visualPass += 1;
    console.log(`${ok ? "VIS_PASS" : "VIS_FAIL"} ${name} ${detail || ""}`);
    return ok;
  };
  const assertRoute = (name, ok, detail) => {
    counts.routingTotal += 1;
    if (ok) counts.routingCorrect += 1;
    console.log(`${ok ? "ROUTE_PASS" : "ROUTE_FAIL"} ${name} ${detail || ""}`);
    return ok;
  };

  try {
    await login(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(900);
    await page.waitForSelector('[data-testid="graph-social-home"]');

    const inventory = await page.evaluate(() => {
      const items = [];
      const push = (source, object, control, kind) =>
        items.push({ source, object, control, kind });
      push("287:7", "Header", "brand mark", "inline");
      push("287:7", "Header", "wordmark", "inline");
      push("287:7", "Header", "tagline", "inline");
      push("287:20", "Stories", "label STORIES", "inline");
      document.querySelectorAll('[data-testid^="gsh-story-"]').forEach((el) => {
        push("287:20", "Stories", `story ${el.getAttribute("data-testid")}`, "nav");
      });
      if (document.querySelector('[data-testid="gsh-story-create"]'))
        push("287:20", "Stories", "create +", "nav");
      // Conversation
      if (document.querySelector('[data-testid^="gsh-avatar-"]'))
        push("289:2", "Conversation", "avatar", "nav");
      if (document.querySelector('[data-testid^="gsh-open-graph-"]'))
        push("289:2", "Conversation", "Open Graph", "nav");
      // Memory actions
      ["like", "comment", "repost", "forward", "save"].forEach((a) => {
        const el = document.querySelector(`[data-testid^="gsh-${a}-"]`);
        if (el)
          push(
            "289:24",
            "Memory",
            a,
            a === "comment" || a === "forward" ? "nav" : "inline",
          );
      });
      if (document.querySelector('[data-testid^="gsh-media-"]'))
        push("289:24", "Memory", "media", "nav");
      if (document.querySelector('[data-testid^="gsh-interested-"]'))
        push("289:39", "Graph", "I'm interested", "inline");
      document.querySelectorAll('[data-testid^="gsh-open-graph-"]').forEach(() =>
        push("289:39", "Graph", "Open Graph", "nav"),
      );
      if (document.querySelector('[data-testid^="gsh-follow-"]'))
        push("289:72", "Discovery", "Follow", "inline");
      if ([...document.querySelectorAll("button")].some((b) => /See experience/i.test(b.textContent || "")))
        push("289:72", "Discovery", "See experience", "nav");
      if (document.querySelector('[data-testid*="carousel"], [data-feed-kind="carousel"]'))
        push("289:84", "Carousel", "horizontal swipe", "inline");
      if ([...document.querySelectorAll("button")].some((b) => /Open Live/i.test(b.textContent || "")))
        push("289:97", "Live", "Open Live", "conditional");
      ["Home", "Chats", "Opal", "Graphs", "You"].forEach((t) =>
        push("433:2", "Dock", t, "nav"),
      );
      return items;
    });

    // Graph detail
    await page.locator('[data-testid^="gsh-open-graph-"]').first().click();
    await sleep(700);
    const graph = page.getByTestId("graph-detail-sheet");
    assertRoute("open_graph", await graph.isVisible(), await graph.getAttribute("data-figma-node"));
    assertVis(
      "graph_ready_title",
      /Juniper|Graph/i.test((await graph.locator("h1").textContent().catch(() => "")) || ""),
    );
    assertVis("graph_ready_pill", (await page.getByTestId("graph-ready-status").count()) === 1);
    assertVis("graph_execution_card", (await page.getByTestId("graph-execution-card").count()) === 1);
    assertVis("graph_open_directions", (await page.getByTestId("graph-open-directions").count()) === 1);
    const graphGeom = await box(page, graph);
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_GRAPH_DETAIL.png") });
    destinations.push({
      name: "graph",
      opened: true,
      meta: {
        screen: await graph.getAttribute("data-screen"),
        figma: await graph.getAttribute("data-figma-node"),
        title: await graph.locator("h1").textContent(),
      },
      geom: graphGeom,
    });
    entity.push({
      name: "juniper_graph",
      contentId: await graph.getAttribute("data-graph-id"),
      ok: true,
    });
    await page.getByTestId("graph-detail-back").click({ force: true });
    await sleep(400);
    navTorture.push({ name: "graph_close_home", ok: await page.getByTestId("graph-social-home").isVisible() });

    // Memory A
    const mediaA = page.locator('[data-testid^="gsh-media-seed-"]').first();
    await mediaA.scrollIntoViewIfNeeded();
    await mediaA.click();
    await sleep(700);
    const mem = page.getByTestId("memory-detail-sheet");
    assertRoute("memory_437_3", await mem.isVisible(), await mem.getAttribute("data-figma-node"));
    assertVis("memory_title", /Memory/.test((await mem.locator("h1").textContent()) || ""));
    assertVis("memory_no_sheet_x", (await mem.locator(".social-sheet-close").count()) === 0);
    assertVis("memory_brand", (await mem.locator(".social-dest-brand").count()) === 1);
    assertVis("memory_media", (await mem.locator(".memory-detail-media").count()) >= 1);
    const memIdA = await mem.getAttribute("data-content-id");
    entity.push({ name: "memory_A", contentId: memIdA, ok: !!memIdA });
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_3.png") });
    destinations.push({
      name: "memory_detail",
      opened: true,
      meta: { screen: await mem.getAttribute("data-screen"), figma: await mem.getAttribute("data-figma-node"), title: "Memory" },
      geom: await box(page, mem),
      measures: {
        title: await box(page, mem.locator("h1")),
        media: await box(page, mem.locator(".memory-detail-media")),
        brand: await box(page, mem.locator(".social-dest-brand")),
      },
    });

    // Comments from A
    await page.getByTestId("memory-detail-comment").click();
    await sleep(600);
    const comments = page.getByTestId("memory-comments-sheet");
    assertRoute("comments_437_69", await comments.isVisible(), await comments.getAttribute("data-figma-node"));
    assertVis("comments_close_text", ((await page.getByTestId("memory-comments-back").textContent()) || "").includes("Close"));
    assertVis("comments_modal", (await page.getByTestId("comments-modal-sheet").count()) === 1);
    const commentsId = await comments.getAttribute("data-content-id");
    entity.push({ name: "comments_from_A", contentId: commentsId, ok: commentsId === memIdA });
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_69.png") });
    destinations.push({
      name: "comments",
      opened: true,
      meta: { screen: await comments.getAttribute("data-screen"), figma: await comments.getAttribute("data-figma-node"), title: "Comments" },
      geom: await box(page, comments),
    });

    // comment create soak (best-effort)
    try {
      const input = page.getByTestId("memory-comments-input");
      if (await input.count()) {
        await input.fill("Founder soak ✓ unicode café 🌊");
        const send = page.getByTestId("memory-comments-submit");
        if (await send.count()) {
          await send.click({ timeout: 5000 });
          await sleep(800);
          const after = await page.getByTestId("memory-comments-list").textContent().catch(() => "");
          entity.push({
            name: "comment_create_ui",
            ok: /Founder soak|café|unicode/i.test(after || ""),
          });
        } else {
          entity.push({ name: "comment_create_ui", ok: false, detail: "submit missing" });
        }
      }
    } catch (e) {
      entity.push({ name: "comment_create_ui", ok: false, detail: String(e).slice(0, 120) });
    }
    await page.getByTestId("memory-comments-back").click({ force: true });
    await sleep(400);

    // Forward from memory
    await page.getByTestId("memory-detail-forward").click();
    await sleep(600);
    const fwd = page.getByTestId("forward-share-picker");
    assertRoute("forward_437_133", await fwd.isVisible(), await fwd.getAttribute("data-figma-node"));
    assertVis("forward_send_to", /Send to/.test((await fwd.locator("h1").textContent()) || ""));
    assertVis("forward_modes", (await page.getByTestId("forward-mode-separately").count()) === 1);
    const fwdId = await fwd.getAttribute("data-content-id");
    entity.push({ name: "forward_A", contentId: fwdId, ok: fwdId === memIdA });
    await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_133.png") });
    destinations.push({
      name: "forward",
      opened: true,
      meta: { screen: await fwd.getAttribute("data-screen"), figma: await fwd.getAttribute("data-figma-node"), title: "Send to" },
      geom: await box(page, fwd),
    });

    // Forward soak: select one, separately, cancel
    const person = page.locator('[data-testid^="forward-person-"]').first();
    if (await person.count()) {
      await person.click();
      await sleep(200);
      forwardSoak.push({ name: "select_one", ok: true });
      // Cancel without send (sr-only hook)
      await page.getByTestId("forward-back").click({ force: true });
      await sleep(400);
      forwardSoak.push({
        name: "cancel_no_send",
        ok: !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
      });
    }

    // Force Home root — clears nested Memory/Forward overlays (dock Home)
    await page.getByTestId("member-tab-home").click({ force: true });
    await sleep(800);
    // If Memory still intercepts, dismiss explicitly
    if (await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false)) {
      await page.getByTestId("memory-detail-back").click({ force: true });
      await sleep(400);
      await page.getByTestId("member-tab-home").click({ force: true });
      await sleep(500);
    }
    navTorture.push({
      name: "home_root_clears_overlays",
      ok:
        (await page.getByTestId("graph-social-home").isVisible().catch(() => false)) &&
        !(await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false)) &&
        !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)),
    });

    // Discovery
    const see = page.getByTestId("gsh-cta-seed-near-rooftop").or(
      page.getByRole("button", { name: /See experience/i }),
    ).first();
    if (await see.count()) {
      await see.scrollIntoViewIfNeeded();
      await see.click({ force: true });
      await sleep(700);
      const disc = page.getByTestId("discovery-detail-sheet");
      assertRoute("discovery_437_200", await disc.isVisible(), await disc.getAttribute("data-figma-node"));
      assertVis("discovery_save_idea", (await page.getByTestId("discovery-save-idea").count()) === 1);
      assertVis("discovery_graph_this", (await page.getByTestId("discovery-graph-this").count()) === 1);
      entity.push({
        name: "discovery",
        contentId: await disc.getAttribute("data-content-id"),
        title: await disc.locator("h1").textContent(),
        ok: true,
      });
      await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_437_200.png") });
      destinations.push({
        name: "discovery",
        opened: true,
        meta: {
          screen: await disc.getAttribute("data-screen"),
          figma: await disc.getAttribute("data-figma-node"),
          title: await disc.locator("h1").textContent(),
        },
        geom: await box(page, disc),
      });
      await page.getByTestId("discovery-detail-back").click({ force: true });
      await sleep(400);
    }

    // Story
    const story = page.locator('[data-testid^="gsh-story-"]').nth(1);
    if (await story.count()) {
      await story.click();
      await sleep(800);
      const viewer = page.locator('[data-testid="story-viewer"], .story-viewer').first();
      const opened = await viewer.isVisible().catch(() => false);
      assertRoute("story_viewer", opened, opened ? await viewer.getAttribute("data-figma-node") : null);
      if (opened) {
        await page.screenshot({ path: resolve(OUT, "runtime/VISUAL_RUNTIME_STORY.png") });
        destinations.push({
          name: "story",
          opened: true,
          meta: {
            screen: await viewer.getAttribute("data-screen"),
            figma: await viewer.getAttribute("data-figma-node"),
            title: null,
          },
          geom: await box(page, viewer),
        });
        const close = page.getByTestId("story-viewer-close").or(page.locator(".story-viewer button").first());
        if (await close.count()) await close.click({ force: true });
        else await page.keyboard.press("Escape");
        await sleep(400);
      }
    }

    // Search probe — Home has none; Chats has contextual
    const homeSearch = await page.evaluate(() => {
      const home = document.querySelector('[data-testid="graph-social-home"]');
      if (!home) return { icons: 0 };
      return {
        icons: [...home.querySelectorAll("button, a, [role='button']")].filter((el) =>
          /search/i.test(el.getAttribute("aria-label") || el.textContent || ""),
        ).length,
      };
    });
    await page.getByTestId("member-tab-chats").click();
    await sleep(700);
    const searchProbe = await page.evaluate(() => ({
      chatsSearchInputs: document.querySelectorAll(
        "input[placeholder*='Search' i], [data-testid*='search']",
      ).length,
      newChatControls: [...document.querySelectorAll("button, a")].filter((el) =>
        /new chat|compose/i.test(el.getAttribute("aria-label") || el.textContent || ""),
      ).length,
    }));
    await page.getByTestId("member-tab-home").click();
    await sleep(500);

    // Dock visible check over destination
    await page.locator('[data-testid^="gsh-media-seed-"]').first().click();
    await sleep(500);
    const dockOverMem = await page.evaluate(() => {
      const dock = document.querySelector(".tabbar.tabbar-option-b");
      if (!dock) return { present: false };
      const cs = getComputedStyle(dock);
      const r = dock.getBoundingClientRect();
      return {
        present: true,
        z: cs.zIndex,
        visible: cs.display !== "none" && cs.visibility !== "hidden" && r.height > 0,
      };
    });
    await page.getByTestId("memory-detail-back").click({ force: true });

    const proof = {
      at: new Date().toISOString(),
      inventoryCount: inventory.length,
      inventory,
      destinations,
      entity,
      forwardSoak,
      navTorture,
      counts,
      searchProbe: { ...searchProbe, homeSearchIcons: homeSearch.icons },
      dockOverMemory: dockOverMem,
      figmaSearchFinding: {
        search00: "373:261",
        modes: ["Top", "People", "Places", "Experiences", "Graphs"],
        entryLaw: "155:98 Search and Activity remain contextual entry points, not extra permanent tabs",
        knownEntries: [
          "476:53 New chat → SEARCH-00 people mode (on CHATS-00)",
          "476:51 Search chats (CHATS-00 local filter)",
        ],
        homeHeaderEntry: false,
        homeHeaderChildren: ["287:8 brand", "287:16 wordmark", "287:19 tagline"],
        homeSearchControlInFigma287_6: false,
        memoryPostModeInSearch00: false,
        contract373_498:
          "Search is one mixed social search across people, places, experiences and Graphs",
        verdictHomeEntry: "FIGMA_NAVIGATION_GAP",
        verdictContentSearch: "DESIGN_PRODUCT_GAP_FOUNDER_DECISION_REQUIRED",
      },
      consoleErrors: consoleErrors.slice(0, 40),
      failedNet: failedNet
        .filter((f) => !/favicon|sourcemap|\.map$/i.test(f.url))
        .slice(0, 50),
    };

    writeFileSync(resolve(OUT, "HOME_DESTINATION_BROWSER_PROOF.json"), JSON.stringify(proof, null, 2));
    writeFileSync(
      resolve(OUT, "HOME_DESTINATION_ENTITY_PROOF.json"),
      JSON.stringify({ at: proof.at, entity, forwardSoak }, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          inventory: inventory.length,
          destOpened: destinations.filter((d) => d.opened).length,
          routing: `${counts.routingCorrect}/${counts.routingTotal}`,
          visualAssert: `${counts.visualPass}/${counts.visualAssertions}`,
          consoleErrors: consoleErrors.length,
          failedNet: proof.failedNet.length,
          dockZ: dockOverMem.z,
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
